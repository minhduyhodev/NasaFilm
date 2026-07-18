import { MapPin, DoorOpen, Clock, AlertTriangle } from 'lucide-react';
import { handlePosterError } from '../../../../shared/utils/mediaUrlUtils';
import { StatusBadge } from './showtimesUi';
import {
  formatTimeOnly,
  formatDateShort,
  formatWeekday,
  formatPrice,
  getValidTransitions,
  getTransitionBtnClass,
} from './showtimesConstants';

const ShowtimeCard = ({
  row,
  movies,
  isSelected,
  isConflict,
  onToggleSelect,
  onStatusTransition,
  onOpenDetail,
  getPosterSrc,
}) => {
  const trans = getValidTransitions(row.status);
  const movieObj = movies.find((m) => m.uuid === row.movieUuid);
  const rawPoster = movieObj?.primaryMediaUrl || row.moviePosterUrl;

  return (
    <article
      className={`st-card status-${row.status} ${isSelected ? 'selected' : ''}`}
    >
      <label className="st-card__check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="st-checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(row.uuid)}
          aria-label="Chọn suất chiếu"
        />
      </label>

      <button
        type="button"
        className="st-card__main"
        onClick={() => onOpenDetail?.(row)}
        title="Xem chi tiết suất chiếu"
      >
        <div className="st-card__poster">
          <img
            src={getPosterSrc(rawPoster, 160)}
            data-original-url={rawPoster || ''}
            alt={row.movieTitle}
            loading="lazy"
            decoding="async"
            onError={handlePosterError}
          />
        </div>

        <div className="st-card__body">
          <div className="st-card__toprow">
            <StatusBadge status={row.status} />
            {isConflict && (
              <span className="st-card__conflict" title="Trùng khung giờ với suất khác trong phòng">
                <AlertTriangle className="w-3 h-3" /> Trùng giờ
              </span>
            )}
          </div>

          <h3 className="st-card__title" title={row.movieTitle}>{row.movieTitle}</h3>

          <p className="st-card__place">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{row.cinemaName}</span>
            <DoorOpen className="w-3 h-3" />
            <span className="truncate">{row.cinemaRoomName}</span>
          </p>

          <div className="st-card__schedule">
            <span className="st-card__date">
              {row.startTime ? `${formatWeekday(new Date(row.startTime))}, ${formatDateShort(new Date(row.startTime))}` : '—'}
            </span>
            <span className="st-card__time adm-tabular">
              <Clock className="w-3 h-3" />
              {formatTimeOnly(row.startTime)} → {formatTimeOnly(row.endTime)}
            </span>
          </div>

          <div className="st-card__prices adm-tabular">
            <span title="Ghế thường">{formatPrice(row.basePrice)}</span>
            <span className="st-card__price-tag" title="Ghế VIP">VIP {formatPrice(row.vipPrice)}</span>
            <span className="st-card__price-tag" title="Ghế đôi">Đôi {formatPrice(row.couplePrice)}</span>
          </div>
        </div>
      </button>

      {trans.length > 0 && (
        <footer className="st-card__foot">
          {trans.map((t) => (
            <button
              key={t.target}
              type="button"
              onClick={() => onStatusTransition(row.uuid, t.target)}
              className={`st-card__action ${getTransitionBtnClass(t.target)}`}
            >
              {t.label}
            </button>
          ))}
        </footer>
      )}
    </article>
  );
};

export default ShowtimeCard;
