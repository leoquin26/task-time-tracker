const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { getDateRangeUser } = require('../utils/dateRange');

/**
 * POST /api/goals
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
      endDate: new Date(endDate),
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
 * Detalle con progreso usando la misma lógica de filtrado que daily
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // 1. Obtener goal
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // 2. Zona horaria del usuario y límites en local
    const user = await User.findById(req.user.id);
    const tz = user.timezone || 'UTC';

    // Igual que getDateRangeUser, pero con fechas custom:
    const start = moment.tz(goal.startDate, tz).startOf('day').toDate();
    const end   = moment.tz(goal.endDate,   tz).endOf('day').toDate();

    // 3. Traer tareas exactamente entre esos límites
    const tasks = await Task.find({
      userId: req.user.id,
      fecha: { $gte: start, $lte: end }
    }).sort({ fecha: -1 });

    // 4. Calcular métricas
    const achieved = tasks.reduce((sum, t) => sum + (t.monto || 0), 0);
    const days = moment(goal.endDate).diff(moment(goal.startDate), 'days') + 1;
    const dailyTarget = goal.targetAmount / days;
    const rate = user.hourlyRate || 0;
    const hoursPerDay = rate > 0 ? dailyTarget / rate : 0;

    res.json({
      ...goal.toObject(),
      progress: {
        achieved: Number(achieved.toFixed(2)),
        remaining: Number(Math.max(goal.targetAmount - achieved, 0).toFixed(2)),
        percent: Number(Math.min((achieved / goal.targetAmount) * 100, 100).toFixed(2)),
        days,
        dailyTarget: Number(dailyTarget.toFixed(2)),
        hoursPerDay: Number(hoursPerDay.toFixed(2)),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/goals/:id
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
