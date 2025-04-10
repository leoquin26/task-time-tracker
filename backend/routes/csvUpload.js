// routes/tasks/csvUpload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

// Define la carpeta de uploads: si existe la variable de entorno UPLOADS_DIR la usa; 
// sino, en producción usa /tmp/uploads (directorio writable en entornos serverless)
// y en desarrollo usa la carpeta local "uploads" en el directorio raíz del backend.
const baseUploadsDir =
  process.env.UPLOADS_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads'));

if (!fs.existsSync(baseUploadsDir)) {
  fs.mkdirSync(baseUploadsDir, { recursive: true });
}

// Configuración de multer para subir archivos CSV a la carpeta definida
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, baseUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/**
 * Convierte una cadena de duración en horas decimales.
 * Soporta formatos como "1h 3m 34s", "47m 46s", "1h", etc.
 */
function parseDuration(durationStr) {
  if (!durationStr || durationStr.trim() === '-') return 0;
  let hours = 0, minutes = 0, seconds = 0;
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
 * Limpia la tasa (rateApplied) a número.
 * Ejemplo: "$24.50/hr" => 24.50
 */
function parseRate(rateStr) {
  if (!rateStr || rateStr.trim() === '-') return 0;
  const cleaned = rateStr.replace(/\$/g, '').replace(/,/g, '').replace(/\/hr/i, '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Parsea el payout (monto) a número.
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
  
  try {
    // Leer el CSV y esperar a que se complete la lectura
    const csvData = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
    
    // Agrupar filas que se deben combinar
    const grouped = {}; // Clave: itemID + fecha (en formato ISO de solo fecha)
    const tasksToInsert = [];
    
    for (const row of csvData) {
      // Se espera que el CSV tenga: workDate, itemID, duration, rateApplied, payout, payType, projectName, status
      if (!row.payType || !row.itemID || !row.workDate) continue;
      const payType = row.payType.trim().toLowerCase();
      
      // Para registros a agrupar (prepay, overtimepay, overtime)
      if (payType === 'prepay' || payType === 'overtimepay' || payType === 'overtime') {
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
        // Para registros que se procesan de forma individual (missionReward, hubstaffOperation, payAdjustment, etc.)
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
    
    // Procesar las agrupaciones
    for (const key in grouped) {
      const group = grouped[key];
      // Si sólo existe overtime sin prepay, utiliza únicamente overtime
      if (!group.prepay && group.overtime) {
        const task = {
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
      const task = {
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
    
    console.log("Tareas a insertar:", tasksToInsert);
    
    // Inserción masiva de las tareas en la base de datos
    const insertedTasks = await Task.insertMany(tasksToInsert);
    
    // Elimina el archivo CSV una vez procesado
    fs.unlinkSync(filePath);
    
    res.json({ message: 'CSV processed and tasks inserted', count: insertedTasks.length });
  } catch (err) {
    console.error("Error processing CSV data:", err);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: 'Error processing CSV data' });
  }
});

module.exports = router;
