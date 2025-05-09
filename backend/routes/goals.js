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
    // Obtener zona horaria del usuario
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const tz = user.timezone || 'UTC';
    // Almacenar las fechas tal como se reciben, interpretadas en la zona horaria del usuario
    const start = moment.tz(startDate, tz).toDate();
    const end   = moment.tz(endDate,   tz).toDate();

    console.log(`Creating goal for user in timezone ${tz}`);
    console.log(`Input startDate: ${startDate}, stored as: ${start}`);
    console.log(`Input endDate: ${endDate}, stored as: ${end}`);

    const goal = new Goal({
      userId: req.user.id,
      title,
      targetAmount,
      startDate: start,
      endDate: end
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
 * Listar todos los goals activos del usuario (que no han alcanzado su endDate)
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const tz = user.timezone || 'UTC';
    
    // Calcular la fecha actual en la zona horaria del usuario
    const now = moment.tz(tz).toDate();

    const goals = await Goal.find({ 
      userId: req.user.id,
      endDate: { $gte: now } // Only active goals
    }).sort({ startDate: -1 });

    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/goals/history
 * Listar goals completados (cuyo endDate ha pasado)
 */
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const tz = user.timezone || 'UTC';

    // Calcular la fecha actual en la zona horaria del usuario
    const now = moment.tz(tz).toDate();

    const goals = await Goal.find({ 
      userId: req.user.id,
      endDate: { $lt: now } // Only completed goals
    }).sort({ endDate: -1 });

    // Enrich each goal with progress metrics
    const detailedGoals = await Promise.all(
      goals.map(async (goal) => {
        // Tomar fechas ya ajustadas a start/end of day
        const startLocal = moment.tz(goal.startDate, tz);
        const endLocal   = moment.tz(goal.endDate,   tz).endOf('day');

        // Convertir a UTC para la consulta
        const startUtc = startLocal.utc().toDate();
        const endUtc   = endLocal.utc().toDate();

        // Traer tareas en ese rango
        const tasks = await Task.find({
          userId: req.user.id,
          fecha: { $gte: startUtc, $lte: endUtc }
        });

        // Calcular métricas
        const achieved = tasks.reduce((sum, t) => sum + (t.monto || 0), 0);
        const days = endLocal.diff(startLocal, 'days') + 1;
        const dailyTarget = goal.targetAmount / days;
        const rate = user.hourlyRate || 0;
        const hoursPerDay = rate > 0 ? dailyTarget / rate : 0;
        const percentCompleted = Math.min((achieved / goal.targetAmount) * 100, 100);
        const percentRemaining = 100 - percentCompleted;

        return {
          ...goal.toObject(),
          progress: {
            achieved: Number(achieved.toFixed(2)),
            remaining: Number(Math.max(goal.targetAmount - achieved, 0).toFixed(2)),
            percent: Number(percentCompleted.toFixed(2)),
            percentRemaining: Number(percentRemaining.toFixed(2)),
            days,
            dailyTarget: Number(dailyTarget.toFixed(2)),
            hoursPerDay: Number(hoursPerDay.toFixed(2))
          }
        };
      })
    );

    res.json(detailedGoals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/goals/:id
 * Detalle de un goal con su progreso
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // 1. Obtener el goal
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // 2. Zona horaria del usuario
    const user = await User.findById(req.user.id);
    const tz = user.timezone || 'UTC';

    // 3. Tomar fechas ya ajustadas a start/end of day
    const startLocal = moment.tz(goal.startDate, tz);
    const endLocal   = moment.tz(goal.endDate,   tz).endOf('day');

    // 4. Convertir a UTC para la consulta
    const startUtc = startLocal.utc().toDate();
    const endUtc   = endLocal.utc().toDate();

    // 5. Traer tareas en ese rango
    const tasks = await Task.find({
      userId: req.user.id,
      fecha: { $gte: startUtc, $lte: endUtc }
    });

    // 6. Calcular métricas
    const achieved = tasks.reduce((sum, t) => sum + (t.monto || 0), 0);
    const days = endLocal.diff(startLocal, 'days') + 1;
    const dailyTarget = goal.targetAmount / days;
    const rate = user.hourlyRate || 0;
    const hoursPerDay = rate > 0 ? dailyTarget / rate : 0;

    res.json({
      ...goal.toObject(),
      progress: {
        achieved:       Number(achieved.toFixed(2)),
        remaining:      Number(Math.max(goal.targetAmount - achieved, 0).toFixed(2)),
        percent:        Number(Math.min((achieved / goal.targetAmount) * 100, 100).toFixed(2)),
        days,
        dailyTarget:    Number(dailyTarget.toFixed(2)),
        hoursPerDay:    Number(hoursPerDay.toFixed(2))
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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const tz = user.timezone || 'UTC';
    const start = moment.tz(startDate, tz).toDate();
    const end   = moment.tz(endDate,   tz).toDate();

    console.log(`Updating goal for user in timezone ${tz}`);
    console.log(`Input startDate: ${startDate}, stored as: ${start}`);
    console.log(`Input endDate: ${endDate}, stored as: ${end}`);

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, targetAmount, startDate: start, endDate: end },
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