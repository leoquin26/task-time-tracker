// routes/tasks/csvUpload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task'); // Ajusta la ruta según tu estructura
const authMiddleware = require('../middleware/authMiddleware');

// Define la ruta absoluta para la carpeta "uploads"
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para subir archivos CSV a la carpeta "uploads/"
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/**
 * Convierte una cadena de duración en horas decimales.
 * Soporta formatos como "1h 3m 34s", "47m 46s", "1h", etc.
 */
function parseDuration(durationStr) {
  if (!durationStr || durationStr.trim() === '-' ) return 0;
  let hours = 0, minutes = 0, seconds = 0;
  const hourMatch = durationStr.match(/(\d+)\s*h/i);
  const minuteMatch = durationStr.match(/(\d+)\s*m/i);
  const secondMatch = durationStr.match(/(\d+)\s*s/i);
  if (hourMatch) { hours = parseInt(hourMatch[1], 10); }
  if (minuteMatch) { minutes = parseInt(minuteMatch[1], 10); }
  if (secondMatch) { seconds = parseInt(secondMatch[1], 10); }
  return hours + minutes / 60 + seconds / 3600;
}

/**
 * Limpia la tasa (rateApplied) a número.
 * Ejemplo: "$24.50/hr" => 24.50
 */
function parseRate(rateStr) {
  if (!rateStr || rateStr.trim() === '-') return 0;
  const cleaned = rateStr.replace(/\$/g, '').replace(/,/g, '').replace(/\/hr/i, '').trim();
  return parseFloat(cleaned) || 0;
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
 * POST /api/tasks/upload-csv
 * Procesa un CSV y agrega tareas.
 * Se espera recibir el archivo CSV en el campo "file" del form-data.
 */
router.post('/upload-csv', authMiddleware, upload.single('file'), async (req, res) => {
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
        // Variables para almacenar tareas y agrupaciones
        const grouped = {}; // clave compuesta
        const tasksToInsert = [];
        
        for (const row of csvData) {
          // Se espera que el CSV tenga: workDate, itemID, duration, rateApplied, payout, payType, projectName, status
          // Aseguramos que los campos necesarios existan y se limpien
          if (!row.payType || !row.itemID || !row.workDate) continue;
          const payType = row.payType.trim().toLowerCase();
          
          // Si es un registro que se agrupa (prepay, overtimepay, overtime)
          if (payType === 'prepay' || payType === 'overtimepay' || payType === 'overtime') {
            // Creamos una clave compuesta usando itemID y la fecha (solo la parte de la fecha)
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
                overtime: null
              };
            }
            
            if (payType === 'prepay') {
              if (grouped[key].prepay) {
                grouped[key].prepay.durationSum += parseDuration(row.duration);
                grouped[key].prepay.payoutSum += parsePayout(row.payout);
              } else {
                grouped[key].prepay = {
                  durationSum: parseDuration(row.duration),
                  payoutSum: parsePayout(row.payout)
                };
              }
            } else { // overtime o overtimepay
              if (grouped[key].overtime) {
                grouped[key].overtime.durationSum += parseDuration(row.duration);
                grouped[key].overtime.payoutSum += parsePayout(row.payout);
              } else {
                grouped[key].overtime = {
                  durationSum: parseDuration(row.duration),
                  payoutSum: parsePayout(row.payout)
                };
              }
            }
          } else {
            // Para tipos que se procesan individualmente (missionReward, hubstaffOperation, payAdjustment, etc.)
            let task = {
              userId: req.user.id,
              fecha: new Date(row.workDate),
              descripcion: `${row.payType} - ${row.projectName} - ${row.itemID}`,
              horas: 0,
              monto: parsePayout(row.payout),
              taskingHours: 0,
              exceedHours: 0
            };
            if (payType === 'hubstaffoperation') {
              const duration = parseDuration(row.duration);
              task.horas = duration;
              task.taskingHours = duration;
            }
            tasksToInsert.push(task);
          }
        }
        
        // Procesar cada grupo acumulado
        for (const key in grouped) {
          const group = grouped[key];
          // Si sólo existe overtime sin prepay, usar solo overtime
          if (!group.prepay && group.overtime) {
            let task = {
              userId: req.user.id,
              fecha: new Date(group.workDate),
              descripcion: `Task ${group.itemID} - ${group.projectName} - ${group.status}`,
              taskingHours: 0,
              exceedHours: group.overtime.durationSum,
              horas: group.overtime.durationSum,
              monto: group.overtime.payoutSum
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
            monto: totalPayout
          };
          tasksToInsert.push(task);
          console.log(`Task procesada - itemID: ${group.itemID}, prepay: ${group.prepay.payoutSum}, overtime: ${group.overtime ? group.overtime.payoutSum : 0}, total: ${totalPayout}`);
        }
        
        // Debug: mostrar las tareas a insertar
        console.log("Tareas a insertar:", tasksToInsert);
        
        // Inserción masiva de tareas
        const insertedTasks = await Task.insertMany(tasksToInsert);
        fs.unlinkSync(filePath);
        
        res.json({ message: 'CSV processed and tasks inserted', count: insertedTasks.length });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing CSV data' });
      }
    });
});

module.exports = router;
