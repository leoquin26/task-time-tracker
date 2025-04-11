const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { getDateRangeUser } = require('../utils/dateRange');

/* --------------------------------------------------
   Endpoints Fijos
-------------------------------------------------- */

// PUT /api/tasks/adjust-dates - (No se modifica para este ejemplo)
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
        _id: { $ne: lastTask._id },
      },
      [{ $set: { fecha: { $subtract: ["$fecha", 86400000] } } }]
    );
    res.json({ message: `Updated ${result.modifiedCount} tasks` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks/parse (No se modifica)
router.post('/parse', authMiddleware, async (req, res) => {
  try {
    const { text, fecha } = req.body;
    // ... [procesamiento de tarea]
    // Se obtiene la zona horaria del usuario y se interpreta la fecha
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const fullRate = user.hourlyRate;
    const timezone = user.timezone || 'UTC';
    let localDate = fecha ? moment.tz(fecha + " 00:00", timezone).toDate() : moment.tz(timezone).toDate();
    // ...
    const newTask = new Task({ /* ... */ });
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
      fecha: { $gte: start, $lte: end },
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
      fecha: { $gte: start, $lte: end },
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
      fecha: { $gte: start, $lte: end },
    }).sort({ fecha: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* --------------------------------------------------
   Endpoint: Summary (no afectado por paginación)
-------------------------------------------------- */
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    let match = { userId: new mongoose.Types.ObjectId(req.user.id) };
    if (req.query.startDate && req.query.endDate) {
      const user = await User.findById(req.user.id);
      const timezone = user.timezone || 'UTC';
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
          totalEarned: { $sum: "$monto" },
        },
      },
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
// (Incluye endpoints GET /, GET /:id, POST /, PUT /:id, DELETE /, etc.)
/* ... */

module.exports = router;
