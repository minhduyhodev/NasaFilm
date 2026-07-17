import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Calendar, Trash2 } from 'lucide-react';
import PosterImage from '../../../shared/components/PosterImage';
import { notificationService } from '../../../shared/services/notificationService';
import {
  loadMovieReminders,
  removeMovieReminder,
  saveMovieReminders,
  REMINDERS_UPDATED_EVENT,
} from '../utils/movieReminderUtils';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AccountUtilityPages.css';

const RemindersPage = () => {
  const confirm = useConfirm();
  const [reminders, setReminders] = useState(loadMovieReminders);

  const refresh = useCallback(() => {
    setReminders(loadMovieReminders());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(REMINDERS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REMINDERS_UPDATED_EVENT, refresh);
  }, [refresh]);

  const handleRemove = async (movieUuid, title) => {
    const ok = await confirm({
      title: 'Hủy nhắc hẹn',
      message: 'Bạn có chắc muốn hủy nhắc hẹn suất chiếu cho phim này?',
      highlight: title || 'Phim đã chọn',
      confirmLabel: 'Hủy nhắc hẹn',
      variant: 'warning',
    });
    if (!ok) return;

    const next = removeMovieReminder(movieUuid, reminders);
    setReminders(next);
    saveMovieReminders(next);
    notificationService.info(`Đã hủy nhắc nhở cho "${title || 'phim này'}"`);
  };

  const activeReminders = reminders.filter((item) => !item.notified);
  const pastReminders = reminders.filter((item) => item.notified);

  return (
    <div className="account-page">
      <main className="account-page__main account-page__main--narrow">
        <header className="account-page__header">
          <div>
            <span className="account-page__eyebrow">Tài khoản / Lịch phim</span>
            <h1 className="account-page__title">Nhắc hẹn suất chiếu</h1>
            <p className="account-page__intro">
              Theo dõi phim sắp công chiếu. NASAFILM sẽ nhắc bạn khi đến lịch phát hành hoặc suất chiếu gần nhất.
            </p>
          </div>
        </header>

        {activeReminders.length === 0 ? (
          <section className="account-empty">
            <Bell className="account-empty__icon" />
            <h2 className="account-empty__title">Chưa có lịch nhắc</h2>
            <p className="account-empty__copy">
              Chọn “Nhắc tôi” ở khu vực phim sắp chiếu để không bỏ lỡ thời điểm mở bán vé.
            </p>
            <Link to="/" className="account-action account-action--primary">
              Khám phá phim
            </Link>
          </section>
        ) : (
          <ul className="reminder-list">
            {activeReminders.map((item) => (
              <li key={item.movieUuid} className="reminder-card">
                <Link
                  to={`/movie/${item.movieUuid}`}
                  className="reminder-card__poster"
                  aria-label={`Xem chi tiết ${item.title || 'phim sắp chiếu'}`}
                >
                  {item.posterUrl ? (
                    <PosterImage
                      src={item.posterUrl}
                      alt={`Poster phim ${item.title || 'sắp chiếu'}`}
                      width={180}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-600">
                      <BellRing className="h-8 w-8" />
                    </div>
                  )}
                </Link>

                <div className="min-w-0">
                  <Link to={`/movie/${item.movieUuid}`} className="reminder-card__title">
                    {item.title || 'Phim sắp chiếu'}
                  </Link>
                  {item.remindLabel && (
                    <p className="reminder-card__schedule">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Nhắc lúc {item.remindLabel}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.movieUuid, item.title)}
                  className="account-action account-action--secondary reminder-card__remove"
                  aria-label={`Hủy nhắc phim ${item.title || ''}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hủy nhắc
                </button>
              </li>
            ))}
          </ul>
        )}

        {pastReminders.length > 0 && (
          <section className="account-subsection" aria-labelledby="past-reminders-title">
            <h2 className="account-subsection__title" id="past-reminders-title">Đã thông báo</h2>
            <ul className="past-reminder-list">
              {pastReminders.map((item) => (
                <li key={`past-${item.movieUuid}`} className="past-reminder-row">
                  <span>{item.title || item.movieUuid}</span>
                  <time>{item.remindLabel || 'Không có thời gian'}</time>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default RemindersPage;
