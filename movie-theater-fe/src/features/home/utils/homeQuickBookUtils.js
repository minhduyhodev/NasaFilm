export const formatShowtimeDate = (dateObj) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const dateStr = dateObj.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });

  if (isSameDay(dateObj, today)) return `Hôm nay, ${dateStr}`;
  if (isSameDay(dateObj, tomorrow)) return `Ngày mai, ${dateStr}`;

  const weekdayStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
  return `${weekdayStr.charAt(0).toUpperCase()}${weekdayStr.slice(1)}, ${dateStr}`;
};

export const formatShowtimeTime = (dateObj) => {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatEarliestShowtimeLabel = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return '';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = formatShowtimeTime(d);
  if (isSameDay(d, today)) return `Suất sớm hôm nay · ${time}`;
  if (isSameDay(d, tomorrow)) return `Suất sớm ngày mai · ${time}`;
  return `Suất sớm · ${d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} ${time}`;
};

/** movieUuid or movieTitle → earliest upcoming showtime */
export function buildEarliestShowtimeByMovie(showtimes = []) {
  const now = Date.now();
  const map = new Map();

  showtimes.forEach((st) => {
    const t = new Date(st.startTime).getTime();
    if (Number.isNaN(t) || t <= now) return;

    const keys = [st.movieUuid, st.movieTitle].filter(Boolean);
    keys.forEach((key) => {
      const prev = map.get(key);
      if (!prev || t < new Date(prev.startTime).getTime()) {
        map.set(key, st);
      }
    });
  });

  return map;
}

export function resolveMovieEarliestShowtime(movie, showtimeMap) {
  if (!movie || !showtimeMap?.size) return null;
  return (
    showtimeMap.get(movie.uuid) ||
    showtimeMap.get(movie.title) ||
    (movie.nextShowtimeStart ? { startTime: movie.nextShowtimeStart } : null)
  );
}
