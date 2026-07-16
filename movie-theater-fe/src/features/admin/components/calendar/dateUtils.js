/** Shared YYYY-MM-DD helpers for admin calendar / date pickers. */

/** Monday-first (common VN calendar convention). */
export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WEEKDAY_FULL = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toIsoDate(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseIsoDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!year || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  return { year, monthIndex, day };
}

export function todayIso() {
  const d = new Date();
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatMonthLabel(year, monthIndex) {
  return `Tháng ${monthIndex + 1}, ${year}`;
}

export function formatMonthYear(year, monthIndex) {
  const names = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];
  return `${names[monthIndex]} ${year}`;
}

export function formatDisplayDate(iso) {
  const p = parseIsoDate(iso);
  if (!p) return '';
  return `${pad2(p.day)}/${pad2(p.monthIndex + 1)}/${p.year}`;
}

/**
 * Builds a 6×7 Monday-first month grid.
 * @returns {{ day: number, monthIndex: number, year: number, iso: string, isCurrentMonth: boolean }[]}
 */
export function getMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const firstDow = first.getDay(); // 0=Sun
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;

  const days = [];
  const prevLast = new Date(year, monthIndex, 0).getDate();
  for (let i = mondayOffset - 1; i >= 0; i -= 1) {
    const day = prevLast - i;
    const m = monthIndex === 0 ? 11 : monthIndex - 1;
    const y = monthIndex === 0 ? year - 1 : year;
    days.push({ day, monthIndex: m, year: y, iso: toIsoDate(y, m, day), isCurrentMonth: false });
  }

  const currentCount = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= currentCount; day += 1) {
    days.push({
      day,
      monthIndex,
      year,
      iso: toIsoDate(year, monthIndex, day),
      isCurrentMonth: true,
    });
  }

  let nextDay = 1;
  while (days.length < 42) {
    const m = monthIndex === 11 ? 0 : monthIndex + 1;
    const y = monthIndex === 11 ? year + 1 : year;
    days.push({
      day: nextDay,
      monthIndex: m,
      year: y,
      iso: toIsoDate(y, m, nextDay),
      isCurrentMonth: false,
    });
    nextDay += 1;
  }

  return days;
}

export function shiftMonth(year, monthIndex, delta) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function isDateDisabled(iso, min, max) {
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

/** Split datetime-local value into date + time parts. */
export function splitDateTimeLocal(value) {
  if (!value) return { date: '', time: '' };
  const [date = '', timePart = ''] = String(value).split('T');
  const time = timePart.slice(0, 5);
  return { date, time };
}

export function joinDateTimeLocal(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}
