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
function getDateRange(period, referenceDate = new Date(), timezone = 'UTC') {
  // Convert the reference date to the user's timezone
  const now = new Date(referenceDate);
  const offset = timezone === 'UTC' ? 0 : now.getTimezoneOffset(); // Get offset if not UTC
  now.setMinutes(now.getMinutes() - offset); // Adjust to UTC

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
          totalMonto: { $sum: "$monto" },
          days: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } } }
        }
      },
      {
        $project: {
          _id: 0,
          totalHoras: { $round: ["$totalHoras", 6] },
          totalTareas: 1,
          totalMonto: { $round: ["$totalMonto", 2] },
          uniqueDays: { $size: "$days" }
        }
      }
    ]);
    return metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0, uniqueDays: 1 };
  } catch (err) {
    console.error('Error fetching task metrics:', err.message);
    return { totalHoras: 0, totalTareas: 0, totalMonto: 0, uniqueDays: 1 };
  }
}

/**
 * Fetch historical task count to calculate average tasks, hours, and earnings per day.
 */
async function fetchHistoricalMetrics(userId, start, end) {
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
          totalMonto: { $sum: "$monto" },
          days: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } } }
        }
      },
      {
        $project: {
          _id: 0,
          totalHoras: { $round: ["$totalHoras", 6] },
          totalTareas: 1,
          totalMonto: { $round: ["$totalMonto", 2] },
          uniqueDays: { $size: "$days" }
        }
      }
    ]);
    return metrics[0] || { totalHoras: 0, totalTareas: 0, totalMonto: 0, uniqueDays: 1 };
  } catch (err) {
    console.error('Error fetching historical metrics:', err.message);
    return { totalHoras: 0, totalTareas: 0, totalMonto: 0, uniqueDays: 1 };
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
    // Fetch the user's timezone from the profile
    const userProfile = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${req.user.token}` },
    });
    const userData = await userProfile.json();
    const userTimezone = userData.timezone || 'UTC';

    const { start, end } = getDateRange('daily', today, userTimezone);

    // Fetch today's metrics
    const todayMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch yesterday's metrics for comparison
    const yesterdayStart = new Date(start);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(start);
    const yesterdayMetrics = await fetchTaskMetrics(req.user.id, yesterdayStart, yesterdayEnd);

    // Fetch historical metrics for the last 30 days to calculate averages
    const historicalStart = new Date(today);
    historicalStart.setUTCDate(historicalStart.getUTCDate() - 30);
    const historicalMetrics = await fetchHistoricalMetrics(req.user.id, historicalStart, end);

    // Calculate averages based on historical data
    const avgTasksPerDay = historicalMetrics.totalTareas / historicalMetrics.uniqueDays;
    const avgHoursPerDay = historicalMetrics.totalHoras / historicalMetrics.uniqueDays;
    const avgEarningsPerDay = historicalMetrics.totalMonto / historicalMetrics.uniqueDays;

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
      totalMonto: todayMetrics.totalMonto,
      productivity,
      target,
      trend,
      shortfall: Math.round(shortfall * 100) / 100, // Round to 2 decimal places
      previousPeriod: yesterdayMetrics.totalMonto,
      avgTasksPerDay: Math.round(avgTasksPerDay * 100) / 100, // Average tasks per day over the last 30 days
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100, // Average hours per day over the last 30 days
      avgEarningsPerDay: Math.round(avgEarningsPerDay * 100) / 100, // Average earnings per day over the last 30 days
      daysConsidered: historicalMetrics.uniqueDays // Number of days considered for the average
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
    // Fetch the user's timezone from the profile
    const userProfile = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${req.user.token}` },
    });
    const userData = await userProfile.json();
    const userTimezone = userData.timezone || 'UTC';

    const { start, end } = getDateRange('weekly', today, userTimezone);

    // Fetch this week's metrics
    const thisWeekMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch last week's metrics for comparison
    const lastWeekStart = new Date(start);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const lastWeekEnd = new Date(start);
    const lastWeekMetrics = await fetchTaskMetrics(req.user.id, lastWeekStart, lastWeekEnd);

    // Fetch historical metrics for the last 12 weeks to calculate averages
    const historicalStart = new Date(today);
    historicalStart.setUTCDate(historicalStart.getUTCDate() - 84); // 12 weeks
    const historicalMetrics = await fetchHistoricalMetrics(req.user.id, historicalStart, end);

    // Calculate averages based on historical data
    const avgTasksPerDay = historicalMetrics.totalTareas / historicalMetrics.uniqueDays;
    const avgHoursPerDay = historicalMetrics.totalHoras / historicalMetrics.uniqueDays;
    const avgEarningsPerDay = historicalMetrics.totalMonto / historicalMetrics.uniqueDays;

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
      totalMonto: thisWeekMetrics.totalMonto,
      avgTasksPerDayThisWeek: thisWeekMetrics.totalTareas / thisWeekMetrics.uniqueDays,
      avgHoursPerDayThisWeek: thisWeekMetrics.totalHoras / thisWeekMetrics.uniqueDays,
      avgEarningsPerDayThisWeek: thisWeekMetrics.totalMonto / thisWeekMetrics.uniqueDays,
      avgTasksPerDayHistorical: Math.round(avgTasksPerDay * 100) / 100,
      avgHoursPerDayHistorical: Math.round(avgHoursPerDay * 100) / 100,
      avgEarningsPerDayHistorical: Math.round(avgEarningsPerDay * 100) / 100,
      daysConsidered: historicalMetrics.uniqueDays,
      productivity,
      target: target * daysInWeek,
      trend,
      shortfall: Math.round(shortfall * 100) / 100,
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
    // Fetch the user's timezone from the profile
    const userProfile = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${req.user.token}` },
    });
    const userData = await userProfile.json();
    const userTimezone = userData.timezone || 'UTC';

    const { start, end } = getDateRange('monthly', today, userTimezone);

    // Fetch this month's metrics
    const thisMonthMetrics = await fetchTaskMetrics(req.user.id, start, end);

    // Fetch last month's metrics for comparison
    const lastMonthStart = new Date(start);
    lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
    const lastMonthEnd = new Date(start);
    const lastMonthMetrics = await fetchTaskMetrics(req.user.id, lastMonthStart, lastMonthEnd);

    // Fetch historical metrics for the last 6 months to calculate averages
    const historicalStart = new Date(today);
    historicalStart.setUTCMonth(historicalStart.getUTCMonth() - 6);
    const historicalMetrics = await fetchHistoricalMetrics(req.user.id, historicalStart, end);

    // Calculate averages based on historical data
    const avgTasksPerDay = historicalMetrics.totalTareas / historicalMetrics.uniqueDays;
    const avgHoursPerDay = historicalMetrics.totalHoras / historicalMetrics.uniqueDays;
    const avgEarningsPerDay = historicalMetrics.totalMonto / historicalMetrics.uniqueDays;

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
      totalMonto: thisMonthMetrics.totalMonto,
      avgTasksPerDayThisMonth: thisMonthMetrics.totalTareas / thisMonthMetrics.uniqueDays,
      avgHoursPerDayThisMonth: thisMonthMetrics.totalHoras / thisMonthMetrics.uniqueDays,
      avgEarningsPerDayThisMonth: thisMonthMetrics.totalMonto / thisMonthMetrics.uniqueDays,
      avgTasksPerDayHistorical: Math.round(avgTasksPerDay * 100) / 100,
      avgHoursPerDayHistorical: Math.round(avgHoursPerDay * 100) / 100,
      avgEarningsPerDayHistorical: Math.round(avgEarningsPerDay * 100) / 100,
      daysConsidered: historicalMetrics.uniqueDays,
      productivity,
      target: target * daysInMonth,
      trend,
      shortfall: Math.round(shortfall * 100) / 100,
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
    const period = req.query.period || 'weekly';
    const periodsBack = parseInt(req.query.periodsBack) || 5;

    const today = new Date();
    // Fetch the user's timezone from the profile
    const userProfile = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${req.user.token}` },
    });
    const userData = await userProfile.json();
    const userTimezone = userData.timezone || 'UTC';

    const metrics = [];
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

      const { start, end } = getDateRange(period, refDate, userTimezone);
      const periodMetrics = await fetchTaskMetrics(req.user.id, start, end);

      metrics.push({
        period: period === 'daily'
          ? format(start, 'yyyy-MM-dd')
          : period === 'weekly'
          ? `Week of ${format(start, 'yyyy-MM-dd')}`
          : format(start, 'yyyy-MM'),
        totalHoras: periodMetrics.totalHoras,
        totalTareas: periodMetrics.totalTareas,
        totalMonto: periodMetrics.totalMonto,
        avgTasksPerDay: periodMetrics.totalTareas / periodMetrics.uniqueDays,
        avgHoursPerDay: periodMetrics.totalHoras / periodMetrics.uniqueDays,
        avgEarningsPerDay: periodMetrics.totalMonto / periodMetrics.uniqueDays
      });
    }

    res.json(metrics.reverse());
  } catch (err) {
    console.error('Error in /historical endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;