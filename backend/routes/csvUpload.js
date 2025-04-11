// routes/tasks/csvUpload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const os = require('os'); // Se usa para obtener el directorio temporal
const Task = require('../models/Task'); // Ajusta la ruta según tu estructura
const authMiddleware = require('../middleware/authMiddleware');

// Usa el directorio temporal del sistema para almacenar archivos en Vercel (/tmp)
const uploadsDir = path.join(os.tmpdir(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para guardar archivos CSV en el directorio temporal
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

/**
 * Convierte una cadena de duración en horas decimales.
 * Soporta formatos como "1h 3m 34s", "47m 46s", "1h", etc.
 */
function parseDuration(durationStr) {
  if (!durationStr || durationStr.trim() === '-') return 0;
  let hours = 0,
    minutes = 0,
    seconds = 0;
  const hourMatch = durationStr.match(/(\d+)\s*h/i);
  const minuteMatch = durationStr.match(/(\d+)\s*m/i);
  const secondMatch = durationStr.match(/(\d+)\s*s/i);
  if (hourMatch) {
    hours = parseInt(hourMatch[1], 10);
  }
  if (minuteMatch) {
    minutes = parseInt(minuteMatch[1], 10);
  }
  if (secondMatch) {
    seconds = parseInt(secondMatch[1], 10);
  }
  return hours + minutes / 60 + seconds / 3600;
}

/**
 * Parse el payout (monto) a número.
 * Ejemplo: "$16.33" => 16.33
 */
function parsePayout(payoutStr) {
  if (!payoutStr || payoutStr.trim() === '-') return 0;
  const cleaned = payoutStr.replace(/\$/g, '').replace(/,/g, '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * POST /api/csv/upload-csv
 * Procesa un CSV y agrega tareas a la base de datos.
 * Se espera recibir el archivo CSV en el campo "file" del form-data.
 */
router.post('/upload-csv', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file provided' });
  }

  const filePath = req.file.path;
  const csvData = [];

  // Leer el CSV y acumular todas las filas
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (data) => csvData.push(data))
    .on('error', (error) => {
      console.error("Error reading CSV file:", error);
      return res.status(500).json({ message: "Error reading CSV file" });
    })
    .on('end', async () => {
      console.log(`CSV rows read: ${csvData.length}`);
      try {
        // Variables para almacenar tareas agrupadas y tareas individuales
        const grouped = {}; // Objeto para agrupar por clave compuesta (itemID + workDate)
        const tasksToInsert = [];

        // Recorrer cada fila del CSV
        for (const row of csvData) {
          // Se espera que el CSV tenga: workDate, itemID, duration, rateApplied, payout, payType, projectName, status
          // Si faltan campos críticos, se omite la fila
          if (!row.payType || !row.itemID || !row.workDate) continue;
          const payType = row.payType.trim().toLowerCase();

          // Si el registro es de tipo agrupable (prepay, overtimepay, overtime)
          if (payType === 'prepay' || payType === 'overtimepay' || payType === 'overtime') {
            // Usamos itemID y la parte de la fecha (en formato ISO sin tiempo) como clave
            const workDateIso = new Date(row.workDate).toISOString().split('T')[0];
            const key = row.itemID.trim() + '-' + workDateIso;

            if (!grouped[key]) {
              grouped[key] = {
                workDate: row.workDate,
                rateApplied: row.rateApplied,
                projectName: row.projectName,
                status: row.status,
                itemID: row.itemID,
                prepay: null,
                overtime: null,
              };
            }

            if (payType === 'prepay') {
              if (grouped[key].prepay) {
                grouped[key].prepay.durationSum += parseDuration(row.duration);
                grouped[key].prepay.payoutSum += parsePayout(row.payout);
              } else {
                grouped[key].prepay = {
                  durationSum: parseDuration(row.duration),
                  payoutSum: parsePayout(row.payout),
                };
              }
            } else {
              // Para overtime o overtimepay
              if (grouped[key].overtime) {
                grouped[key].overtime.durationSum += parseDuration(row.duration);
                grouped[key].overtime.payoutSum += parsePayout(row.payout);
              } else {
                grouped[key].overtime = {
                  durationSum: parseDuration(row.duration),
                  payoutSum: parsePayout(row.payout),
                };
              }
            }
          } else {
            // Para registros que se procesan individualmente (ej. missionReward, hubstaffOperation, payAdjustment, etc.)
            let task = {
              userId: req.user.id,
              fecha: new Date(row.workDate),
              descripcion: `${row.payType} - ${row.projectName} - ${row.itemID}`,
              horas: 0,
              monto: parsePayout(row.payout),
              taskingHours: 0,
              exceedHours: 0,
            };
            if (payType === 'hubstaffoperation') {
              const duration = parseDuration(row.duration);
              task.horas = duration;
              task.taskingHours = duration;
            }
            tasksToInsert.push(task);
          }
        }

        // Procesar los registros agrupados
        for (const key in grouped) {
          const group = grouped[key];
          // Si sólo existe overtime sin prepay, usamos solo overtime
          if (!group.prepay && group.overtime) {
            let task = {
              userId: req.user.id,
              fecha: new Date(group.workDate),
              descripcion: `Task ${group.itemID} - ${group.projectName} - ${group.status}`,
              taskingHours: 0,
              exceedHours: group.overtime.durationSum,
              horas: group.overtime.durationSum,
              monto: group.overtime.payoutSum,
            };
            tasksToInsert.push(task);
            console.log(`Task (solo overtime) - itemID: ${group.itemID}, payout: ${group.overtime.payoutSum}`);
            continue;
          }
          if (!group.prepay) continue;
          const prepayDuration = group.prepay.durationSum;
          const overtimeDuration = group.overtime ? group.overtime.durationSum : 0;
          const totalPayout = group.prepay.payoutSum + (group.overtime ? group.overtime.payoutSum : 0);
          let task = {
            userId: req.user.id,
            fecha: new Date(group.workDate),
            descripcion: `Task ${group.itemID} - ${group.projectName} - ${group.status}`,
            taskingHours: prepayDuration,
            exceedHours: overtimeDuration,
            horas: prepayDuration + overtimeDuration,
            monto: totalPayout,
          };
          tasksToInsert.push(task);
          console.log(
            `Task processed - itemID: ${group.itemID}, prepay: ${group.prepay.payoutSum}, overtime: ${group.overtime ? group.overtime.payoutSum : 0}, total: ${totalPayout}`
          );
        }

        console.log("Total tasks to insert:", tasksToInsert.length);

        // Insertar las tareas en batches para evitar límites en la operación de inserción
        const batchSize = 500;
        let totalInserted = 0;
        for (let i = 0; i < tasksToInsert.length; i += batchSize) {
          const batch = tasksToInsert.slice(i, i + batchSize);
          const inserted = await Task.insertMany(batch, { ordered: false });
          totalInserted += inserted.length;
        }

        // Eliminar el archivo CSV temporalmente guardado
        fs.unlinkSync(filePath);

        res.json({ message: 'CSV processed and tasks inserted', count: totalInserted });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing CSV data' });
      }
    });
});


/**
 * POST /api/csv/delete-tasks-from-csv
 * Procesa un CSV, extrae todos los itemIDs y elimina todas las tareas del usuario cuya
 * descripción contenga alguno de esos itemIDs (búsqueda case-insensitive).
 */
router.post('/delete-tasks-from-csv', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file provided' });
  }

  const filePath = req.file.path;
  const csvData = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (data) => csvData.push(data))
    .on('end', async () => {
      try {
        // Extraer itemIDs únicos del CSV
        const itemIDs = new Set();
        for (const row of csvData) {
          if (row.itemID) {
            itemIDs.add(row.itemID.trim());
          }
        }
        const itemIDArray = Array.from(itemIDs);
        if (itemIDArray.length === 0) {
          return res.status(400).json({ message: 'No itemIDs found in CSV' });
        }
        
        // Construir consulta para buscar en la descripción alguno de los itemIDs (expresiones regulares, case-insensitive)
        const orConditions = itemIDArray.map(id => ({
          descripcion: { $regex: id, $options: 'i' }
        }));

        const result = await Task.deleteMany({
          userId: req.user.id,
          $or: orConditions,
        });

        fs.unlinkSync(filePath);

        res.json({ message: 'CSV processed and tasks deleted', deletedCount: result.deletedCount });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing CSV data for deletion' });
      }
    });
});

module.exports = router;
