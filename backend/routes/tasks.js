const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User'); // Requerido para obtener la tarifa del usuario
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Función auxiliar para obtener el rango de fechas según el período usando UTC.
 */
function getDateRange(period) {
  const now = new Date();
  let start, end;
  switch (period) {
    case 'daily':
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
      break;
    case 'weekly': {
      const day = now.getUTCDay(); // 0 (Sunday) a 6 (Saturday)
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - day));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - day + 7));
      break;
    }
    case 'monthly':
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
      break;
    default:
      start = now;
      end = now;
  }
  console.log(`Filter [${period}]: start=${start.toISOString()}, end=${end.toISOString()}`);
  return { start, end };
}

/* -----------------------------------------------
   Endpoints Fijos (antes de rutas con parámetros)
   ----------------------------------------------- */

// PUT /api/tasks/adjust-dates - Resta 24 horas a la fecha de todas las tareas (excepto la última)
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
      [{ $set: { fecha: { $subtract: [ "$fecha", 86400000 ] } } }]
    );
    res.json({ message: `Updated ${result.modifiedCount} tasks` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------
   Endpoint para parsear texto y crear tarea
   ----------------------------------------------- */
router.post('/parse', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: "No text provided" });
    }
    
    // Extraer el tiempo normal (Tasking time)
    const taskingRegex = /Tasking time:\s*(?:(\d+)\s*hour[s]?\s*)?(?:(\d+)\s*minute[s]?\s*)?(?:(\d+)\s*second[s]?\s*)?at\s*\$(\d+(?:\.\d+)?)\s*\/\s*hour/i;
    const taskingMatch = text.match(taskingRegex);
    if (!taskingMatch) {
      return res.status(400).json({ message: "Invalid text format for tasking time" });
    }
    const taskingHours = taskingMatch[1] ? Number(taskingMatch[1]) : 0;
    const taskingMinutes = taskingMatch[2] ? Number(taskingMatch[2]) : 0;
    const taskingSeconds = taskingMatch[3] ? Number(taskingMatch[3]) : 0;
    const totalTaskingHours = taskingHours + (taskingMinutes / 60) + (taskingSeconds / 3600);
    
    // Extraer el tiempo excedido (si existe)
    let totalExceedHours = 0;
    let exceedRate = 0;
    if (text.includes("Exceeded time:")) {
      const exceedRegex = /Exceeded time:\s*(?:(\d+)\s*hour[s]?\s*)?(?:(\d+)\s*minute[s]?\s*)?(?:(\d+)\s*second[s]?\s*)?at\s*\$(\d+(?:\.\d+)?)\s*\/\s*hour/i;
      const exceedMatch = text.match(exceedRegex);
      if (exceedMatch) {
        const exHours = exceedMatch[1] ? Number(exceedMatch[1]) : 0;
        const exMinutes = exceedMatch[2] ? Number(exceedMatch[2]) : 0;
        const exSeconds = exceedMatch[3] ? Number(exceedMatch[3]) : 0;
        exceedRate = exceedMatch[4] ? Number(exceedMatch[4]) : 0;
        totalExceedHours = exHours + (exMinutes / 60) + (exSeconds / 3600);
      }
    }
    
    // Obtener la tarifa del usuario
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const fullRate = user.hourlyRate;
    
    // Calcular el monto:
    // monto = (totalTaskingHours * fullRate) + (totalExceedHours * fullRate * 0.3)
    const monto = Number(((totalTaskingHours * fullRate) + (totalExceedHours * fullRate * 0.3)).toFixed(2));
    
    const newTask = new Task({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: new Date(),
      taskingHours: totalTaskingHours,
      exceedHours: totalExceedHours,
      horas: totalTaskingHours + totalExceedHours,
      monto,
      descripcion: text,
    });
    
    await newTask.save();
    res.json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -----------------------------------------------
   Endpoints para Filtrar Tasks por Período
   ----------------------------------------------- */

// GET /api/tasks/filter/daily
router.get('/filter/daily', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('daily');
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

// GET /api/tasks/filter/weekly
router.get('/filter/weekly', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('weekly');
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

// GET /api/tasks/filter/monthly
router.get('/filter/monthly', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('monthly');
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

/* -----------------------------------------------
   Endpoints Clásicos para Tasks (duplicados removibles)
   ----------------------------------------------- */

// GET /api/tasks
router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };
  if (startDate && endDate) {
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

// GET /api/tasks/:id
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

// POST /api/tasks (Modo Clásico - Create)
router.post('/', authMiddleware, async (req, res) => {
  const { fecha, taskingHours, exceedHours, descripcion } = req.body;
  try {
    // Convertir la fecha (se espera en formato "yyyy-MM-dd") a objeto Date local
    let localDate;
    if (fecha) {
      const parts = fecha.split("-");
      if (parts.length === 3) {
        localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        localDate = new Date(fecha);
      }
    } else {
      localDate = new Date();
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const fullRate = user.hourlyRate;
    
    // Calcular el monto: monto = (taskingHours * fullRate) + (exceedHours * fullRate * 0.3)
    const monto = Number(((taskingHours * fullRate) + (exceedHours * fullRate * 0.3)).toFixed(2));
    
    const task = new Task({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: localDate,
      taskingHours,
      exceedHours,
      horas: Number(taskingHours) + Number(exceedHours),
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

// PUT /api/tasks/:id (Modo Clásico - Edit)
router.put('/:id', authMiddleware, async (req, res) => {
  const { fecha, taskingHours, exceedHours, descripcion } = req.body;
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      userId: new mongoose.Types.ObjectId(req.user.id)
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (fecha) {
      const parts = fecha.split("-");
      if (parts.length === 3) {
        task.fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        task.fecha = new Date(fecha);
      }
    }
    task.taskingHours = taskingHours !== undefined ? taskingHours : task.taskingHours;
    task.exceedHours = exceedHours !== undefined ? exceedHours : task.exceedHours;
    task.horas = Number(task.taskingHours) + Number(task.exceedHours);
    task.descripcion = descripcion !== undefined ? descripcion : task.descripcion;
    
    // Recalcular el monto usando la tarifa del usuario
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const fullRate = user.hourlyRate;
    task.monto = Number(((task.taskingHours * fullRate) + (task.exceedHours * fullRate * 0.3)).toFixed(2));
    
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// DELETE /api/tasks/:id (Modo Clásico)
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
