export const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

export const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  const firstDayIndex = date.getDay();
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthDaysCount = prevMonthDate.getDate();
  for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDaysCount - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }
  const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= currentMonthDaysCount; i++) {
    days.push({ day: i, month, year, isCurrentMonth: true });
  }
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }
  return days;
};

export const getScreeningModeLabel = (mode) => {
  switch (mode) {
    case 'BOTH':
      return 'Cả rạp & Xem Online';
    case 'THEATER_ONLY':
      return 'Chỉ chiếu rạp';
    case 'ONLINE_ONLY':
      return 'Chỉ xem Online';
    case 'NONE':
      return 'Ngừng chiếu';
    default:
      return mode || 'N/A';
  }
};

/** Nhãn độ tuổi admin — khớp options form chỉnh sửa phim. */
export const getAgeRestrictionLabel = (ageRestriction) => {
  const code = (ageRestriction || '').trim().toUpperCase();
  if (!code) return '—';
  switch (code) {
    case 'P':
      return 'P — Mọi lứa tuổi';
    case 'K':
      return 'K — Dưới 13 (có người giám hộ)';
    case 'T13':
      return 'T13 — Từ 13 tuổi';
    case 'T16':
      return 'T16 — Từ 16 tuổi';
    case 'T18':
      return 'T18 — Từ 18 tuổi';
    default:
      return code;
  }
};
