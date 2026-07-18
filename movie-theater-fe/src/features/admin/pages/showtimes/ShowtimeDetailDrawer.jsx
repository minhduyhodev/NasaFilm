import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MapPin, DoorOpen, Clock, Armchair, AlertTriangle, CalendarDays, Timer,
} from 'lucide-react';
import { handlePosterError } from '../../../../shared/utils/mediaUrlUtils';
import { StatusBadge } from './showtimesUi';
import {
  formatTimeOnly,
  formatDateFull,
  formatPrice,
  getShowtimeDurationMin,
  getValidTransitions,
  getTransitionBtnClass,
} from './showtimesConstants';

/**
 * Panel chi tiết suất chiếu — mở khi bấm vào 1 suất ở bất kỳ chế độ xem nào.
 * Gom toàn bộ thông tin + hành động chuyển trạng thái về một chỗ.
 */
const ShowtimeDetailDrawer = ({
  showtime,
  movie,
  isConflict,
  onClose,
  onStatusTransition,
  getPosterSrc,
}) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!showtime) return null;

  const trans = getValidTransitions(showtime.status);
  const rawPoster = movie?.primaryMediaUrl || showtime.moviePosterUrl;
  const duration = getShowtimeDurationMin(showtime);

  return createPortal(
    <div className="std-overlay" onClick={onClose}>
      <aside
        className="std-drawer"
        role="dialog"
        aria-label="Chi tiết suất chiếu"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="std-head">
          <span className="std-head__eyebrow">Chi tiết suất chiếu</span>
          <button type="button" className="std-close" onClick={onClose} aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="std-body st-scroll">
          <div className="std-movie">
            <div className="std-movie__poster">
              <img
                src={getPosterSrc(rawPoster, 200)}
                data-original-url={rawPoster || ''}
                alt={showtime.movieTitle}
                onError={handlePosterError}
              />
            </div>
            <div className="std-movie__info">
              <StatusBadge status={showtime.status} />
              <h3 className="std-movie__title">{showtime.movieTitle}</h3>
              {movie?.durationMinutes && (
                <p className="std-movie__meta">
                  <Timer className="w-3 h-3" /> Phim {movie.durationMinutes} phút
                </p>
              )}
            </div>
          </div>

          {isConflict && (
            <div className="std-conflict">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Suất này <strong>trùng khung giờ</strong> với suất khác trong cùng phòng.
                Kiểm tra lại lịch trước khi mở bán.
              </span>
            </div>
          )}

          <div className="std-section">
            <h4 className="std-section__title">Thời gian & địa điểm</h4>
            <ul className="std-fields">
              <li>
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="std-fields__label">Ngày chiếu</span>
                <span className="std-fields__value">
                  {showtime.startTime ? formatDateFull(showtime.startTime) : '—'}
                </span>
              </li>
              <li>
                <Clock className="w-3.5 h-3.5" />
                <span className="std-fields__label">Khung giờ</span>
                <span className="std-fields__value adm-tabular">
                  {formatTimeOnly(showtime.startTime)} → {formatTimeOnly(showtime.endTime)}
                  {duration ? ` (${duration} phút)` : ''}
                </span>
              </li>
              <li>
                <MapPin className="w-3.5 h-3.5" />
                <span className="std-fields__label">Rạp</span>
                <span className="std-fields__value">{showtime.cinemaName || '—'}</span>
              </li>
              <li>
                <DoorOpen className="w-3.5 h-3.5" />
                <span className="std-fields__label">Phòng</span>
                <span className="std-fields__value">{showtime.cinemaRoomName || '—'}</span>
              </li>
            </ul>
          </div>

          <div className="std-section">
            <h4 className="std-section__title">Bảng giá vé</h4>
            <div className="std-prices">
              <div className="std-price">
                <Armchair className="w-3.5 h-3.5" />
                <span className="std-price__label">Thường</span>
                <span className="std-price__value">{formatPrice(showtime.basePrice)}</span>
              </div>
              <div className="std-price std-price--vip">
                <Armchair className="w-3.5 h-3.5" />
                <span className="std-price__label">VIP</span>
                <span className="std-price__value">{formatPrice(showtime.vipPrice)}</span>
              </div>
              <div className="std-price std-price--couple">
                <Armchair className="w-3.5 h-3.5" />
                <span className="std-price__label">Đôi</span>
                <span className="std-price__value">{formatPrice(showtime.couplePrice)}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="std-foot">
          {trans.length > 0 ? (
            <>
              <span className="std-foot__hint">Chuyển trạng thái</span>
              <div className="std-foot__actions">
                {trans.map((t) => (
                  <button
                    key={t.target}
                    type="button"
                    className={`std-transition ${getTransitionBtnClass(t.target)}`}
                    onClick={() => onStatusTransition(showtime.uuid, t.target)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span className="std-foot__hint std-foot__hint--final">
              Suất chiếu đã ở trạng thái cuối — không thể chuyển tiếp.
            </span>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
};

export default ShowtimeDetailDrawer;
