// Backend/routes/metrics.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Función auxiliar para obtener el rango de fechas según el período utilizando UTC.
 */
function getDateRange(period) {
  const now = new Date();
  let start, end;
  switch (period) {
    case 'daily':
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    case 'weekly':
      const dayOfWeek = now.getUTCDay();
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    case 'monthly':
      start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
      break;
    default:
      start = new Date();
      end = new Date();
  }
  console.log(`Filter [${period}]: start=${start.toISOString()}, end=${end.toISOString()}`);
  return { start, end };
}

// Endpoint para métricas diarias
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('daily');
    const metrics = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          fecha: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalHoras: { $sum: "$horas" },
          totalTareas: { $sum: 1 },
          totalMonto: { $sum: "$monto" }
        }
      },
      {
        $project: {
          _id: 0,
          // Usamos una precisión mayor para evitar errores en la conversión a minutos y segundos
          totalHoras: { $round: ["$totalHoras", 6] },
          totalTareas: 1,
          totalMonto: { $round: ["$totalMonto", 2] }
        }
      }
    ]);
    res.json(metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Endpoint para métricas semanales
router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('weekly');
    const metrics = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          fecha: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalHoras: { $sum: "$horas" },
          totalTareas: { $sum: 1 },
          totalMonto: { $sum: "$monto" }
        }
      },
      {
        $project: {
          _id: 0,
          totalHoras: { $round: ["$totalHoras", 6] },
          totalTareas: 1,
          totalMonto: { $round: ["$totalMonto", 2] }
        }
      }
    ]);
    res.json(metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Endpoint para métricas mensuales
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getDateRange('monthly');
    const metrics = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          fecha: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalHoras: { $sum: "$horas" },
          totalTareas: { $sum: 1 },
          totalMonto: { $sum: "$monto" }
        }
      },
      {
        $project: {
          _id: 0,
          totalHoras: { $round: ["$totalHoras", 6] },
          totalTareas: 1,
          totalMonto: { $round: ["$totalMonto", 2] }
        }
      }
    ]);
    res.json(metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
