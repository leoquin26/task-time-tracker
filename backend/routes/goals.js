const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

/**
 * POST /api/goals
 * Crear un nuevo goal
 */
router.post('/', auth, async (req, res) => {
  try {
    const { title, targetAmount, startDate, endDate } = req.body;
    if (!title || !targetAmount || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const goal = new Goal({
      userId: req.user.id,
      title,
      targetAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });
    await goal.save();
    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/goals
 * Listar todos los goals del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({ startDate: -1 });
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/goals/:id
 * Obtener un goal con su progreso (hasta hoy si está en curso)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Inicio y fin del goal en UTC, al día completo
    const startUtc = moment.utc(goal.startDate).startOf('day').toDate();
    const endUtc   = moment.utc(goal.endDate).endOf('day').toDate();
    // Solo sumamos hasta hoy si hoy es anterior al endUtc
    const todayEndUtc = moment.utc().endOf('day').toDate();
    const effectiveEnd = todayEndUtc < endUtc ? todayEndUtc : endUtc;

    // Buscar tareas entre startUtc y effectiveEnd
    const tasks = await Task.find({
      userId: req.user.id,
      fecha: { $gte: startUtc, $lte: effectiveEnd }
    });

    const achieved = tasks.reduce((sum, t) => sum + (t.monto || 0), 0);

    // Duración completa del goal en días
    const days = moment.utc(goal.endDate)
      .endOf('day')
      .diff(moment.utc(goal.startDate).startOf('day'), 'days') + 1;

    // Cálculo de objetivo diario y horas por día
    const dailyTarget = goal.targetAmount / days;
    const user = await User.findById(req.user.id);
    const rate = user.hourlyRate || 0;
    const hoursPerDay = rate > 0 ? dailyTarget / rate : 0;

    res.json({
      ...goal.toObject(),
      progress: {
        achieved,
        remaining: Math.max(goal.targetAmount - achieved, 0),
        percent: Math.min((achieved / goal.targetAmount) * 100, 100).toFixed(2),
        days,
        dailyTarget: Number(dailyTarget.toFixed(2)),
        hoursPerDay: Number(hoursPerDay.toFixed(2))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/goals/:id
 * Actualizar un goal
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, targetAmount, startDate, endDate } = req.body;
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, targetAmount, startDate: new Date(startDate), endDate: new Date(endDate) },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/goals/:id
 * Eliminar un goal
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
