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
      return 'Ca rap & Xem Online';
    case 'THEATER_ONLY':
      return 'Chi chieu rap';
    case 'ONLINE_ONLY':
      return 'Chi xem Online';
    case 'NONE':
      return 'Ngung chieu';
    default:
      return mode || 'N/A';
  }
};
