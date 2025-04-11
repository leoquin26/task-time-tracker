// routes/tasks.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
// Función auxiliar que calcula el rango de fechas según el período (daily, weekly, monthly)
// tomando en cuenta la zona horaria del usuario.
const { getDateRangeUser } = require('../utils/dateRange');

/* --------------------------------------------------
   Endpoints Fijos (antes de rutas con parámetros)
-------------------------------------------------- */

// PUT /api/tasks/adjust-dates - Resta 24 horas a la fecha de todas las tareas (excepto la última)
router.put('/adjust-dates', authMiddleware, async (req, res) => {
  try {
    const lastTask = await Task.findOne({ userId: new mongoose.Types.ObjectId(req.user.id) })
      .sort({ createdAt: -1 });
    if (!lastTask) {
      return res.status(404).json({ message: 'No tasks found' });
    }
    const result = await Task.updateMany(
      {
        userId: new mongoose.Types.ObjectId(req.user.id),
        _id: { $ne: lastTask._id }
      },
      [{ $set: { fecha: { $subtract: ["$fecha", 86400000] } } }]
    );
    res.json({ message: `Updated ${result.modifiedCount} tasks` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks/parse - Parsea el texto y crea la tarea
router.post('/parse', authMiddleware, async (req, res) => {
  try {
    const { text, fecha } = req.body;
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
    
    // Extraer tiempo excedido (si existe)
    let totalExceedHours = 0;
    if (text.includes("Exceeded time:")) {
      const exceedRegex = /Exceeded time:\s*(?:(\d+)\s*hour[s]?\s*)?(?:(\d+)\s*minute[s]?\s*)?(?:(\d+)\s*second[s]?\s*)?at\s*\$(\d+(?:\.\d+)?)\s*\/\s*hour/i;
      const exceedMatch = text.match(exceedRegex);
      if (exceedMatch) {
        const exHours = exceedMatch[1] ? Number(exceedMatch[1]) : 0;
        const exMinutes = exceedMatch[2] ? Number(exceedMatch[2]) : 0;
        const exSeconds = exceedMatch[3] ? Number(exceedMatch[3]) : 0;
        totalExceedHours = exHours + (exMinutes / 60) + (exSeconds / 3600);
      }
    }
    
    // Obtener datos del usuario (tarifa y zona horaria)
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const fullRate = user.hourlyRate;
    const timezone = user.timezone || 'UTC';

    // Interpretar la fecha proporcionada en la zona horaria del usuario;
    // si no se envía fecha, se toma el momento actual según la zona horaria.
    let localDate;
    if (fecha) {
      localDate = moment.tz(fecha + " 00:00", timezone).toDate();
    } else {
      localDate = moment.tz(timezone).toDate();
    }
    
    // Calcular el monto de la tarea
    const monto = Number(((totalTaskingHours * fullRate) + (totalExceedHours * fullRate * 0.3)).toFixed(2));
    
    const newTask = new Task({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: localDate,
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

/* --------------------------------------------------
   Endpoints para Filtrar Tasks (usando zona horaria del usuario)
-------------------------------------------------- */

// GET /api/tasks/filter/daily
router.get('/filter/daily', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const timezone = user.timezone || 'UTC';
    const { start, end } = getDateRangeUser('daily', timezone);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lte: end }
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
    const user = await User.findById(req.user.id);
    const timezone = user.timezone || 'UTC';
    const { start, end } = getDateRangeUser('weekly', timezone);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lte: end }
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
    const user = await User.findById(req.user.id);
    const timezone = user.timezone || 'UTC';
    const { start, end } = getDateRangeUser('monthly', timezone);
    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      fecha: { $gte: start, $lte: end }
    }).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* --------------------------------------------------
   Endpoint: Resumen de tareas (/summary)
   Este endpoint resume TODAS las tareas del usuario (o sólo aquellas dentro
   de un rango de fechas, si se proporcionan los parámetros startDate y endDate).
   ¡Ninguna de las métricas (totalTasks, totalHours, totalEarned) se verá afectada por la paginación!
-------------------------------------------------- */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    // Se ignoran los parámetros de paginación; sólo se usa startDate y endDate (si se proporcionan)
    let match = { userId: new mongoose.Types.ObjectId(req.user.id) };

    if (req.query.startDate && req.query.endDate) {
      const user = await User.findById(req.user.id);
      const timezone = user.timezone || 'UTC';
      // Convertir las fechas de inicio y fin de la zona del usuario a UTC
      const startUtc = moment.tz(req.query.startDate + " 00:00", timezone).utc().toDate();
      const endUtc = moment.tz(req.query.endDate + " 23:59:59.999", timezone).utc().toDate();
      match.fecha = { $gte: startUtc, $lte: endUtc };
    }

    const summary = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          totalHours: { $sum: "$horas" },
          totalEarned: { $sum: "$monto" }
        }
      }
    ]);

    if (summary.length > 0) {
      res.json(summary[0]);
    } else {
      res.json({ totalTasks: 0, totalHours: 0, totalEarned: 0 });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* --------------------------------------------------
   Endpoints Clásicos para Tasks (CRUD)
-------------------------------------------------- */

// GET /api/tasks - Listado paginado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };

    if (req.query.startDate && req.query.endDate) {
      const user = await User.findById(req.user.id);
      const timezone = user.timezone || 'UTC';
      const start = moment.tz(req.query.startDate + " 00:00", timezone).utc().toDate();
      const end = moment.tz(req.query.endDate + " 23:59:59.999", timezone).utc().toDate();
      filter.fecha = { $gte: start, $lte: end };
    }

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      tasks,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// GET /api/tasks/:id - Obtener tarea por ID
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

// POST /api/tasks - Crear tarea manual (usa la zona horaria del usuario)
router.post('/', authMiddleware, async (req, res) => {
  const { fecha, taskingHours, exceedHours, descripcion } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const fullRate = user.hourlyRate;
    const timezone = user.timezone || 'UTC';

    let localDate;
    if (fecha) {
      localDate = moment.tz(fecha + " 00:00", timezone).toDate();
    } else {
      localDate = moment.tz(timezone).toDate();
    }
    
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

// PUT /api/tasks/:id - Editar tarea
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
      const user = await User.findById(req.user.id);
      const timezone = user.timezone || 'UTC';
      task.fecha = moment.tz(fecha + " 00:00", timezone).toDate();
    }
    task.taskingHours = taskingHours !== undefined ? taskingHours : task.taskingHours;
    task.exceedHours = exceedHours !== undefined ? exceedHours : task.exceedHours;
    task.horas = Number(task.taskingHours) + Number(task.exceedHours);
    task.descripcion = descripcion !== undefined ? descripcion : task.descripcion;
    
    const user = await User.findById(req.user.id);
    const fullRate = user.hourlyRate;
    task.monto = Number(((task.taskingHours * fullRate) + (task.exceedHours * fullRate * 0.3)).toFixed(2));
    
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* -----------------------------------------------------
   Bulk Deletion
----------------------------------------------------- */
router.delete('/bulk', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    if (req.body.ids && Array.isArray(req.body.ids) && req.body.ids.length > 0) {
      const ids = req.body.ids.map(id => new mongoose.Types.ObjectId(id));
      const result = await Task.deleteMany({ _id: { $in: ids }, userId });
      return res.json({ message: `Deleted ${result.deletedCount} selected tasks`, totalDeleted: result.deletedCount });
    }
    const limit = parseInt(req.body.limit) || 100;
    let totalDeleted = 0;
    while (true) {
      const tasks = await Task.find({ userId }).limit(limit).select('_id');
      if (tasks.length === 0) break;
      const ids = tasks.map(task => task._id);
      const result = await Task.deleteMany({ _id: { $in: ids } });
      totalDeleted += result.deletedCount;
    }
    res.json({ message: `Deleted ${totalDeleted} tasks in batches`, totalDeleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting tasks' });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea individual
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
