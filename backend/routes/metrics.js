const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const authMiddleware = require('../middleware/authMiddleware');
const { format } = require('date-fns');

/**
 * Función auxiliar para obtener el rango de fechas según el período utilizando UTC.
 */
function getDateRange(period, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  let start, end;
  switch (period) {
    case 'daily':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    case 'weekly':
      const dayOfWeek = now.getUTCDay();
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    case 'monthly':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      break;
    default:
      start = new Date();
      end = new Date();
  }
  return { start, end };
}

/**
 * Fetch tasks within a date range and aggregate metrics.
 */
async function fetchTaskMetrics(userId, start, end) {
  try {
    const metrics = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
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
    return metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0 };
  } catch (err) {
    console.error('Error fetching task metrics:', err.message);
    return { totalHoras: 0, totalTareas: 0, totalMonto: 0 };
  }
}

/**
 * Fetch historical task count to calculate average tasks per day.
 */
async function fetchHistoricalTaskCount(userId, end) {
  try {
    const metrics = await Task.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          fecha: { $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalTareas: { $sum: 1 },
          days: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } } }
        }
      },
      {
        $project: {
          _id: 0,
          totalTareas: 1,
          uniqueDays: { $size: "$days" }
        }
      }
    ]);
    return metrics[0] || { totalTareas: 0, uniqueDays: 1 };
  } catch (err) {
    console.error('Error fetching historical task count:', err.message);
    return { totalTareas: 0, uniqueDays: 1 };
  }
}

/**
 * Fetch goals within a date range.
 */
async function fetchGoals(userId, start, end) {
  try {
    return await Goal.find({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } }
      ]
    });
  } catch (err) {
    console.error('Error fetching goals:', err.message);
    return [];
  }
}

/**
 * Calculate productivity based on earnings and goal target, or estimate if no goal exists.
 */
function calculateProductivity(earnings, goalTarget, daysInPeriod, historicalAvgEarnings) {
  let target;
  if (goalTarget && goalTarget > 0) {
    // Use goal target if available
    target = goalTarget / daysInPeriod;
  } else {
    // Estimate target based on historical average (if available) or a default
    target = historicalAvgEarnings > 0 ? historicalAvgEarnings * 1.1 : 100; // 10% more than historical average, or default to $100/day
  }
  const productivity = target > 0 ? (earnings / target) * 100 : 0;
  return { productivity: Math.round(productivity), target };
}

// Endpoint para métricas diarias detalladas
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const { start, end } = getDateRange('daily', today);

    // Fetch today's metrics
    const todayMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch yesterday's metrics for comparison
    const yesterdayStart = new Date(start);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(start);
    const yesterdayMetrics = await fetchTaskMetrics(req.user.id, yesterdayStart, yesterdayEnd);

    // Fetch historical task count for average tasks per day
    const historicalTasks = await fetchHistoricalTaskCount(req.user.id, end);
    const avgTasksPerDay = historicalTasks.totalTareas / historicalTasks.uniqueDays;

    // Fetch goals overlapping with today
    const goals = await fetchGoals(req.user.id, start, end);
    const goalTarget = goals.length > 0 ? goals.reduce((sum, goal) => sum + goal.targetAmount, 0) : 0;

    // Calculate productivity
    const { productivity, target } = calculateProductivity(
      todayMetrics.totalMonto,
      goalTarget,
      1, // 1 day
      yesterdayMetrics.totalMonto // Use yesterday's earnings as historical average
    );

    // Calculate trend compared to yesterday
    let trend = yesterdayMetrics.totalMonto > 0
      ? ((todayMetrics.totalMonto - yesterdayMetrics.totalMonto) / yesterdayMetrics.totalMonto) * 100
      : 0;
    trend = Math.round(trend);
    const shortfall = trend < 0 ? Math.abs(yesterdayMetrics.totalMonto - todayMetrics.totalMonto) : 0;

    res.json({
      totalHoras: todayMetrics.totalHoras,
      totalTareas: todayMetrics.totalTareas,
      avgTasksPerDay: Math.round(avgTasksPerDay * 100) / 100, // Round to 2 decimal places
      totalMonto: todayMetrics.totalMonto,
      productivity,
      target,
      trend,
      shortfall: Math.round(shortfall * 100) / 100, // Round to 2 decimal places
      previousPeriod: yesterdayMetrics.totalMonto
    });
  } catch (err) {
    console.error('Error in /daily endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

// Endpoint para métricas semanales detalladas
router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const { start, end } = getDateRange('weekly', today);

    // Fetch this week's metrics
    const thisWeekMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch last week's metrics for comparison
    const lastWeekStart = new Date(start);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const lastWeekEnd = new Date(start);
    const lastWeekMetrics = await fetchTaskMetrics(req.user.id, lastWeekStart, lastWeekEnd);

    // Fetch historical task count for average tasks per day
    const historicalTasks = await fetchHistoricalTaskCount(req.user.id, end);
    const avgTasksPerDay = historicalTasks.totalTareas / historicalTasks.uniqueDays;

    // Fetch goals overlapping with this week
    const goals = await fetchGoals(req.user.id, start, end);
    const goalTarget = goals.length > 0 ? goals.reduce((sum, goal) => sum + goal.targetAmount, 0) : 0;

    // Calculate productivity (average daily earnings vs. target)
    const daysInWeek = 7;
    const { productivity, target } = calculateProductivity(
      thisWeekMetrics.totalMonto / daysInWeek,
      goalTarget,
      daysInWeek,
      lastWeekMetrics.totalMonto / daysInWeek
    );

    // Calculate trend compared to last week
    let trend = lastWeekMetrics.totalMonto > 0
      ? ((thisWeekMetrics.totalMonto - lastWeekMetrics.totalMonto) / lastWeekMetrics.totalMonto) * 100
      : 0;
    trend = Math.round(trend);
    const shortfall = trend < 0 ? Math.abs(lastWeekMetrics.totalMonto - thisWeekMetrics.totalMonto) : 0;

    res.json({
      totalHoras: thisWeekMetrics.totalHoras,
      totalTareas: thisWeekMetrics.totalTareas,
      avgTasksPerDay: Math.round(avgTasksPerDay * 100) / 100, // Round to 2 decimal places
      totalMonto: thisWeekMetrics.totalMonto,
      productivity,
      target: target * daysInWeek, // Total target for the week
      trend,
      shortfall: Math.round(shortfall * 100) / 100, // Round to 2 decimal places
      previousPeriod: lastWeekMetrics.totalMonto
    });
  } catch (err) {
    console.error('Error in /weekly endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

// Endpoint para métricas mensuales detalladas
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const { start, end } = getDateRange('monthly', today);

    // Fetch this month's metrics
    const thisMonthMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch last month's metrics for comparison
    const lastMonthStart = new Date(start);
    lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
    const lastMonthEnd = new Date(start);
    const lastMonthMetrics = await fetchTaskMetrics(req.user.id, lastMonthStart, lastMonthEnd);

    // Fetch historical task count for average tasks per day
    const historicalTasks = await fetchHistoricalTaskCount(req.user.id, end);
    const avgTasksPerDay = historicalTasks.totalTareas / historicalTasks.uniqueDays;

    // Fetch goals overlapping with this month
    const goals = await fetchGoals(req.user.id, start, end);
    const goalTarget = goals.length > 0 ? goals.reduce((sum, goal) => sum + goal.targetAmount, 0) : 0;

    // Calculate productivity (average daily earnings vs. target)
    const daysInMonth = (end - start) / (1000 * 60 * 60 * 24);
    const { productivity, target } = calculateProductivity(
      thisMonthMetrics.totalMonto / daysInMonth,
      goalTarget,
      daysInMonth,
      lastMonthMetrics.totalMonto / daysInMonth
    );

    // Calculate trend compared to last month
    let trend = lastMonthMetrics.totalMonto > 0
      ? ((thisMonthMetrics.totalMonto - lastMonthMetrics.totalMonto) / lastMonthMetrics.totalMonto) * 100
      : 0;
    trend = Math.round(trend);
    const shortfall = trend < 0 ? Math.abs(lastMonthMetrics.totalMonto - thisMonthMetrics.totalMonto) : 0;

    res.json({
      totalHoras: thisMonthMetrics.totalHoras,
      totalTareas: thisMonthMetrics.totalTareas,
      avgTasksPerDay: Math.round(avgTasksPerDay * 100) / 100, // Round to 2 decimal places
      totalMonto: thisMonthMetrics.totalMonto,
      productivity,
      target: target * daysInMonth, // Total target for the month
      trend,
      shortfall: Math.round(shortfall * 100) / 100, // Round to 2 decimal places
      previousPeriod: lastMonthMetrics.totalMonto
    });
  } catch (err) {
    console.error('Error in /monthly endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

// Endpoint para obtener datos históricos (para gráficos)
router.get('/historical', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || 'weekly'; // 'daily', 'weekly', 'monthly'
    const periodsBack = parseInt(req.query.periodsBack) || 5; // Number of periods to fetch

    const today = new Date();
    const metrics = [];

    // Ensure we don't include future dates
    const currentDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    for (let i = 0; i < periodsBack; i++) {
      const refDate = new Date(currentDate);
      if (period === 'daily') {
        refDate.setUTCDate(refDate.getUTCDate() - i);
      } else if (period === 'weekly') {
        refDate.setUTCDate(refDate.getUTCDate() - (i * 7));
      } else if (period === 'monthly') {
        refDate.setUTCMonth(refDate.getUTCMonth() - i);
      }

      // Skip if the reference date is in the future
      if (refDate > currentDate) continue;

      const { start, end } = getDateRange(period, refDate);
      const periodMetrics = await fetchTaskMetrics(req.user.id, start, end);

      metrics.push({
        period: period === 'daily'
          ? format(start, 'yyyy-MM-dd')
          : period === 'weekly'
          ? `Week of ${format(start, 'yyyy-MM-dd')}`
          : format(start, 'yyyy-MM'),
        totalHoras: periodMetrics.totalHoras,
        totalTareas: periodMetrics.totalTareas,
        totalMonto: periodMetrics.totalMonto
      });
    }

    res.json(metrics.reverse());
  } catch (err) {
    console.error('Error in /historical endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;