import tokenService from '../../auth/utils/tokenService';
import { notificationService } from '../../../shared/services/notificationService';

export const REMINDER_STORAGE_KEY = 'nasa_movie_reminders';
export const REMINDERS_UPDATED_EVENT = 'nasa-reminders-updated';

const getUserId = () => tokenService.getUser()?.id || 'guest';

const parseRemindAt = (movie) => {
  const raw = movie?.nextShowtimeStart || movie?.releaseDate;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  if (!movie?.nextShowtimeStart && movie?.releaseDate) {
    date.setHours(9, 0, 0, 0);
  }
  return date.toISOString();
};

export const normalizeReminders = (raw) => {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 0 && typeof raw[0] === 'string') {
    return raw.map((movieUuid) => ({
      movieUuid,
      title: '',
      posterUrl: '',
      remindAt: null,
      remindLabel: '',
      notified: false,
      createdAt: new Date().toISOString(),
    }));
  }
  return raw.filter((item) => item?.movieUuid);
};

export const loadMovieReminders = () => {
  try {
    const raw = localStorage.getItem(`${REMINDER_STORAGE_KEY}_${getUserId()}`);
    return normalizeReminders(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
};

export const saveMovieReminders = (reminders) => {
  localStorage.setItem(`${REMINDER_STORAGE_KEY}_${getUserId()}`, JSON.stringify(reminders));
  window.dispatchEvent(new CustomEvent(REMINDERS_UPDATED_EVENT));
};

export const isReminderSet = (movieUuid, reminders = []) =>
  reminders.some((item) => item.movieUuid === movieUuid);

export const formatReminderLabel = (movie) => {
  if (movie?.nextShowtimeStart) {
    const d = new Date(movie.nextShowtimeStart);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('vi-VN', {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  if (movie?.releaseDate) {
    return `ngày ${movie.releaseDate}`;
  }
  return 'sắp tới';
};

export const buildReminderEntry = (movie) => ({
  movieUuid: movie.uuid,
  title: movie.title || '',
  posterUrl: movie.primaryMediaUrl || movie.poster || '',
  remindAt: parseRemindAt(movie),
  remindLabel: formatReminderLabel(movie),
  notified: false,
  createdAt: new Date().toISOString(),
});

export const toggleMovieReminder = (movie, reminders = []) => {
  if (!movie?.uuid) return reminders;

  if (isReminderSet(movie.uuid, reminders)) {
    return reminders.filter((item) => item.movieUuid !== movie.uuid);
  }

  return [...reminders, buildReminderEntry(movie)];
};

export const removeMovieReminder = (movieUuid, reminders = []) =>
  reminders.filter((item) => item.movieUuid !== movieUuid);

export const checkDueReminders = () => {
  if (!tokenService.getUser()?.id) return;

  const reminders = loadMovieReminders();
  if (!reminders.length) return;

  const now = Date.now();
  let changed = false;

  const updated = reminders.map((item) => {
    if (item.notified || !item.remindAt) return item;
    const dueAt = new Date(item.remindAt).getTime();
    if (Number.isNaN(dueAt) || now < dueAt) return item;

    changed = true;
    const title = item.title || 'Phim sắp chiếu';
    const when = item.remindLabel || 'hôm nay';

    notificationService.success(`Đã đến giờ nhắc: "${title}" (${when})`);
    notificationService.addNotification(
      'Nhắc suất chiếu',
      `"${title}" sắp công chiếu hoặc mở bán vé (${when}). Đặt vé ngay để không bỏ lỡ!`,
      'info'
    );

    return { ...item, notified: true };
  });

  if (changed) {
    saveMovieReminders(updated);
  }
};
