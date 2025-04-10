// utils/dateRange.js
const moment = require('moment-timezone');

/**
 * Devuelve el rango de fechas (start y end) para un período ('daily', 'weekly' o 'monthly'),
 * calculado en la zona horaria del usuario.
 * Se retornan objetos Date en UTC para usarlos en las consultas de MongoDB.
 */
function getDateRangeUser(period, timezone = 'UTC') {
  const now = moment.tz(timezone);
  let start, end;

  switch (period) {
    case 'daily':
      start = now.clone().startOf('day'); // 00:00 en la zona del usuario
      end = now.clone().endOf('day');       // 23:59:59.999 en la zona del usuario
      break;
    case 'weekly':
      start = now.clone().startOf('week');
      end = now.clone().endOf('week');
      break;
    case 'monthly':
      start = now.clone().startOf('month');
      end = now.clone().endOf('month');
      break;
    default:
      start = now;
      end = now;
  }
  // Convertir a Date (en UTC)
  return { start: start.toDate(), end: end.toDate() };
}

module.exports = { getDateRangeUser };
