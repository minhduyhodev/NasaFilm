import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Calendar, History, Trash2 } from 'lucide-react';
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
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

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
  const selectedHistory = pastReminders.find((item) => item.movieUuid === selectedHistoryId)
    || pastReminders[0]
    || null;

  return (
    <div className="account-page">
      <main className="account-page__main">
        <header className="account-page__header">
          <div>
            <span className="account-page__eyebrow">Tài khoản / Lịch phim</span>
            <h1 className="account-page__title">Nhắc hẹn suất chiếu</h1>
            <p className="account-page__intro">
              Theo dõi phim sắp công chiếu. NASAFILM sẽ nhắc bạn khi đến lịch phát hành hoặc suất chiếu gần nhất.
            </p>
          </div>
        </header>

        <div className="reminders-workspace">
          <section className="reminders-primary" aria-labelledby="active-reminders-title">
            <div className="reminders-section-head">
              <div>
                <span>Danh sách chính</span>
                <h2 id="active-reminders-title">Đang nhắc hẹn</h2>
              </div>
              <strong>{activeReminders.length}</strong>
            </div>

            {activeReminders.length === 0 ? (
              <div className="account-empty">
                <Bell className="account-empty__icon" />
                <h2 className="account-empty__title">Chưa có lịch nhắc</h2>
                <p className="account-empty__copy">
                  Chọn “Nhắc tôi” ở khu vực phim sắp chiếu để không bỏ lỡ thời điểm mở bán vé.
                </p>
                <Link to="/" className="account-action account-action--primary">
                  Khám phá phim
                </Link>
              </div>
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
          </section>

          <aside className="reminders-history" aria-labelledby="past-reminders-title">
            <div className="reminders-section-head reminders-section-head--compact">
              <div>
                <span>Lịch sử</span>
                <h2 id="past-reminders-title">Đã thông báo</h2>
              </div>
              <div className="reminders-history__count" aria-label={`${pastReminders.length} thông báo`}>
                <History aria-hidden />
                <strong>{pastReminders.length}</strong>
              </div>
            </div>

            {pastReminders.length === 0 ? (
              <p className="reminders-history__empty">Các nhắc hẹn đã gửi sẽ được lưu tại đây.</p>
            ) : (
              <>
                <div className="reminders-history__table-head" aria-hidden>
                  <span>Phim</span>
                  <span>Lịch nhắc</span>
                </div>
                <div className="reminders-history__list" role="list">
                  {pastReminders.map((item) => {
                    const isSelected = selectedHistory?.movieUuid === item.movieUuid;
                    return (
                      <button
                        key={`past-${item.movieUuid}`}
                        type="button"
                        role="listitem"
                        className={`reminders-history__item${isSelected ? ' is-selected' : ''}`}
                        onClick={() => setSelectedHistoryId(item.movieUuid)}
                        aria-pressed={isSelected}
                      >
                        <span className="reminders-history__item-title">
                          <i aria-hidden />
                          {item.title || item.movieUuid}
                        </span>
                        <time>{item.remindLabel || 'Không có thời gian'}</time>
                      </button>
                    );
                  })}
                </div>

                {selectedHistory && (
                  <article className="reminders-history__detail" aria-live="polite">
                    <div className="reminders-history__detail-poster">
                      {selectedHistory.posterUrl ? (
                        <PosterImage
                          src={selectedHistory.posterUrl}
                          alt={`Poster phim ${selectedHistory.title || 'đã nhắc'}`}
                          width={180}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BellRing aria-hidden />
                      )}
                    </div>
                    <div>
                      <span className="reminders-history__status">Đã gửi thông báo</span>
                      <h3>{selectedHistory.title || 'Phim đã nhắc'}</h3>
                      <p>
                        <Calendar aria-hidden />
                        {selectedHistory.remindLabel || 'Không có thời gian'}
                      </p>
                      {selectedHistory.createdAt && (
                        <time dateTime={selectedHistory.createdAt}>
                          Đã tạo {new Date(selectedHistory.createdAt).toLocaleString('vi-VN')}
                        </time>
                      )}
                      <Link to={`/movie/${selectedHistory.movieUuid}`}>Xem thông tin phim</Link>
                    </div>
                  </article>
                )}
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default RemindersPage;
