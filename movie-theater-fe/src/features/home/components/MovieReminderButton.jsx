import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { notificationService } from '../../../shared/services/notificationService';
import {
  loadMovieReminders,
  saveMovieReminders,
  isReminderSet,
  toggleMovieReminder,
  formatReminderLabel,
  REMINDERS_UPDATED_EVENT,
} from '../utils/movieReminderUtils';

export default function MovieReminderButton({ movie, className = '' }) {
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [reminders, setReminders] = useState(loadMovieReminders);

  useEffect(() => {
    const refresh = () => setReminders(loadMovieReminders());
    refresh();
    window.addEventListener(REMINDERS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REMINDERS_UPDATED_EVENT, refresh);
  }, []);

  const active = Boolean(movie?.uuid && isReminderSet(movie.uuid, reminders));

  const handleClick = useCallback(() => {
    if (!movie?.uuid) return;

    if (!isAuthenticated) {
      notificationService.warning('Vui lòng đăng nhập để đặt nhắc nhở suất chiếu');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    const wasSet = isReminderSet(movie.uuid, reminders);
    const next = toggleMovieReminder(movie, reminders);
    setReminders(next);
    saveMovieReminders(next);

    if (wasSet) {
      notificationService.info(`Đã hủy nhắc nhở cho "${movie.title}"`);
      return;
    }

    const when = formatReminderLabel(movie);
    notificationService.success(
      `Đã đặt nhắc nhở suất chiếu "${movie.title}" (${when})`,
    );
    notificationService.addNotification(
      'Nhắc suất chiếu',
      `Bạn sẽ được nhắc khi "${movie.title}" mở bán vé hoặc đến giờ chiếu (${when}).`,
      'info',
    );
  }, [movie, reminders, isAuthenticated, navigate, location.pathname, location.search]);

  if (!movie?.uuid) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        active
          ? `inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider border border-amber-400/45 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer ${className}`
          : `inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider neon-red-glow hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`
      }
    >
      {active ? (
        <BellRing className="h-4 w-4" aria-hidden />
      ) : (
        <Bell className="h-4 w-4" aria-hidden />
      )}
      {active ? 'Đã nhắc' : 'Nhắc tôi'}
    </button>
  );
}
