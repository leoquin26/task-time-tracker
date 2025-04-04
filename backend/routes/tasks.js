const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Función auxiliar para obtener el rango de fechas según el período, ajustado a la zona horaria del cliente.
 * Se puede pasar un offset (en minutos) para calcular el rango según la hora local del usuario.
 * @param {string} period - "daily", "weekly" o "monthly"
 * @param {number} offsetMinutes - Offset en minutos desde UTC. Si no se envía, se usa el offset del servidor.
 * @returns {Object} { start, end } en UTC, correspondientes al inicio y fin del período en la zona local del usuario.
 */
function getDateRange(period, offsetMinutes) {
  const offset = (offsetMinutes !== undefined) ? Number(offsetMinutes) : new Date().getTimezoneOffset();
  const offsetMs = offset * 60000;
  const clientNow = new Date(Date.now() - offsetMs);
  let clientStartLocal, clientEndLocal;
  switch (period) {
    case 'daily':
      clientStartLocal = new Date(clientNow.getFullYear(), clientNow.getMonth(), clientNow.getDate());
      clientEndLocal = new Date(clientStartLocal.getTime() + 24 * 3600000);
      break;
    case 'weekly':
      const dayOfWeek = clientNow.getDay();
      clientStartLocal = new Date(clientNow.getFullYear(), clientNow.getMonth(), clientNow.getDate() - dayOfWeek);
      clientEndLocal = new Date(clientStartLocal.getTime() + 7 * 24 * 3600000);
      break;
    case 'monthly':
      clientStartLocal = new Date(clientNow.getFullYear(), clientNow.getMonth(), 1);
      clientEndLocal = new Date(clientNow.getFullYear(), clientNow.getMonth() + 1, 1);
      break;
    default:
      clientStartLocal = clientNow;
      clientEndLocal = clientNow;
  }
  const startUTC = new Date(clientStartLocal.getTime() + offsetMs);
  const endUTC = new Date(clientEndLocal.getTime() + offsetMs);
  return { start: startUTC, end: endUTC };
}

/* 
  -----------------------------------------------
  Endpoints Fijos (se definen antes de las rutas con parámetros)
  -----------------------------------------------
*/

// PUT /api/tasks/adjust-dates - Actualiza todas las tareas (excepto la última) restando 1 día (24 horas) a su campo "fecha"
router.put('/adjust-dates', authMiddleware, async (req, res) => {
  try {
    const lastTask = await Task.findOne({ userId: new mongoose.Types.ObjectId(req.user.id) }).sort({ createdAt: -1 });
    if (!lastTask) {
      return res.status(404).json({ message: 'No tasks found' });
    }
    const result = await Task.updateMany(
      { 
        userId: new mongoose.Types.ObjectId(req.user.id),
        _id: { $ne: lastTask._id }
      },
      [
        { $set: { fecha: { $subtract: [ "$fecha", 86400000 ] } } }
      ]
    );
    res.json({ message: `Updated ${result.modifiedCount} tasks` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks/parse - Crear una tarea a partir de texto pegado
router.post('/parse', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: "No text provided" });
    }
    
    // Ejemplo del formato:
    // You earned $25.79 for this task
    // Tasking time: 1 hour at $24.50 / hour
    //
    // Exceeded time: 10 minutes 34 seconds at $7.35 / hour
    
    const taskingRegex = /Tasking time:\s*(?:(\d+)\s*hour[s]?\s*)?(?:(\d+)\s*minute[s]?\s*)?(?:(\d+)\s*second[s]?\s*)?at\s*\$(\d+(?:\.\d+)?)\s*\/\s*hour/i;
    const taskingMatch = text.match(taskingRegex);
    if (!taskingMatch) {
      return res.status(400).json({ message: "Invalid text format for tasking time" });
    }
    const taskingHours = taskingMatch[1] ? Number(taskingMatch[1]) : 0;
    const taskingMinutes = taskingMatch[2] ? Number(taskingMatch[2]) : 0;
    const taskingSeconds = taskingMatch[3] ? Number(taskingMatch[3]) : 0;
    const taskingRate = taskingMatch[4] ? Number(taskingMatch[4]) : 0;
    const totalTaskingHours = taskingHours + (taskingMinutes / 60) + (taskingSeconds / 3600);
    
    let totalExceedHours = 0;
    let exceedRate = 0;
    const exceedRegex = /Exceeded time:\s*(?:(\d+)\s*hour[s]?\s*)?(?:(\d+)\s*minute[s]?\s*)?(?:(\d+)\s*second[s]?\s*)?at\s*\$(\d+(?:\.\d+)?)\s*\/\s*hour/i;
    const exceedMatch = text.match(exceedRegex);
    if (exceedMatch) {
      const exceedHours = exceedMatch[1] ? Number(exceedMatch[1]) : 0;
      const exceedMinutes = exceedMatch[2] ? Number(exceedMatch[2]) : 0;
      const exceedSeconds = exceedMatch[3] ? Number(exceedMatch[3]) : 0;
      exceedRate = exceedMatch[4] ? Number(exceedMatch[4]) : 0;
      totalExceedHours = exceedHours + (exceedMinutes / 60) + (exceedSeconds / 3600);
    }
    
    const totalHours = totalTaskingHours + totalExceedHours;
    const roundedHours = Number(totalHours.toFixed(3));
    const computedAmount = (totalTaskingHours * taskingRate) + (totalExceedHours * exceedRate);
    const roundedAmount = Number(computedAmount.toFixed(2));
    
    const newTask = new Task({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: new Date(),
      horas: roundedHours,
      monto: roundedAmount,
      descripcion: text,
    });
    
    await newTask.save();
    res.json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoints para filtrar Tasks por período usando la función getDateRange:
router.get('/filter/daily', authMiddleware, async (req, res) => {
  try {
    const offset = req.query.offset ? Number(req.query.offset) : new Date().getTimezoneOffset();
    const { start, end } = getDateRange('daily', offset);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lt: end }
    }).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
router.get('/filter/weekly', authMiddleware, async (req, res) => {
  try {
    const offset = req.query.offset ? Number(req.query.offset) : new Date().getTimezoneOffset();
    const { start, end } = getDateRange('weekly', offset);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lt: end }
    }).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
router.get('/filter/monthly', authMiddleware, async (req, res) => {
  try {
    const offset = req.query.offset ? Number(req.query.offset) : new Date().getTimezoneOffset();
    const { start, end } = getDateRange('monthly', offset);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lt: end }
    }).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET /api/tasks - Endpoint por defecto con filtro de rango personalizado
router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };
  if (startDate && endDate) {
    // Se asume que el cliente envía las fechas en formato "yyyy-MM-dd".
    // Se forzan a UTC agregando "T00:00:00Z" para el inicio, y se ajusta el end al final del día.
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    end.setUTCHours(23, 59, 59, 999);
    filter.fecha = { $gte: start, $lte: end };
  }
  try {
    const tasks = await Task.find(filter).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET /api/tasks/:id - Obtener una tarea por ID (asegúrate de que esta ruta se coloque después de las rutas fijas)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(req.user.id)
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// POST /api/tasks - Crear una tarea (modo clásico) - (Duplicado, si ya lo definiste arriba, puedes eliminarlo)
router.post('/', authMiddleware, async (req, res) => {
  const { fecha, horas, monto, descripcion } = req.body;
  try {
    const task = new Task({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha,
      horas,
      monto,
      descripcion,
    });
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// PUT /api/tasks/:id - Actualizar una tarea (modo clásico) - (Duplicado, si ya lo definiste arriba, puedes eliminarlo)
router.put('/:id', authMiddleware, async (req, res) => {
  const { fecha, horas, monto, descripcion } = req.body;
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(req.user.id)
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    task.fecha = fecha || task.fecha;
    task.horas = horas || task.horas;
    task.monto = monto || task.monto;
    task.descripcion = descripcion || task.descripcion;
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE /api/tasks/:id - Eliminar una tarea (modo clásico) - (Duplicado, si ya lo definiste arriba, puedes eliminarlo)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(req.user.id)
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
