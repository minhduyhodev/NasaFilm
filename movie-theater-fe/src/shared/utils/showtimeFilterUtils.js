export const toDateKey = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const toTimeSlot = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateLabel = (dateKey) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

export const applyShowtimeFilters = (list, filters, keys = []) => {
  let pool = list;
  if (keys.includes('room') && filters.roomUuid) {
    pool = pool.filter((s) => s.cinemaRoomUuid === filters.roomUuid);
  }
  if (keys.includes('roomName') && filters.roomName) {
    pool = pool.filter((s) => s.roomName === filters.roomName);
  }
  if (keys.includes('cinema') && filters.cinemaName) {
    pool = pool.filter((s) => s.cinemaName === filters.cinemaName);
  }
  if (keys.includes('date') && filters.date) {
    pool = pool.filter((s) => toDateKey(s.startTime) === filters.date);
  }
  if (keys.includes('timeSlot') && filters.timeSlot) {
    pool = pool.filter((s) => toTimeSlot(s.startTime) === filters.timeSlot);
  }
  if (keys.includes('movieUuid') && filters.movieUuid) {
    pool = pool.filter((s) => s.movieUuid === filters.movieUuid);
  }
  if (keys.includes('movie') && filters.movie?.trim()) {
    const term = filters.movie.trim().toLowerCase();
    pool = pool.filter((s) => `${s.movieTitle || ''}`.toLowerCase().includes(term));
  }
  return pool;
};
