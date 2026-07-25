// Helpers for the revenue series period picker/navigator. All dates are plain local yyyy-MM-dd
// strings so they line up with <input type="date"> and the backend's Vietnam-local bucketing.

const toYmd = (date) => {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const todayYmd = () => toYmd(new Date());

/**
 * Shift an anchor date by one whole period in the given direction.
 * @param {string} ymd - anchor date as yyyy-MM-dd
 * @param {'day'|'week'|'month'} granularity
 * @param {number} dir - -1 = previous period, +1 = next period
 */
export const shiftPeriod = (ymd, granularity, dir) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  if (granularity === 'week') base.setDate(base.getDate() + dir * 7);
  else if (granularity === 'month') base.setMonth(base.getMonth() + dir);
  else base.setDate(base.getDate() + dir);
  return toYmd(base);
};
