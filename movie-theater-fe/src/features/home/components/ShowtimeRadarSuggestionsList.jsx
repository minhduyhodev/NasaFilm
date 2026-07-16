import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Film, Loader2, MapPin, Sparkles, Ticket } from 'lucide-react';
import PosterImage from '../../../shared/components/PosterImage';
import useDragScroll from '../../../shared/hooks/useDragScroll';

const formatShowtime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RadarSuggestionCard = ({ item, variant }) => {
  const poster = item.moviePosterUrl || item.posterUrl || '';
  const isStrip = variant === 'strip';

  return (
    <Link
      to={`/movie/${item.movieUuid}#select-showtimes`}
      className={`radar-suggestions__card radar-suggestions__card--${variant}`}
      draggable={false}
      onDragStart={isStrip ? (event) => event.preventDefault() : undefined}
    >
      <div className="radar-suggestions__poster">
        {poster ? (
          <PosterImage
            src={poster}
            alt={item.movieTitle}
            width={240}
            className="radar-suggestions__poster-img"
            draggable={false}
          />
        ) : (
          <div className="radar-suggestions__poster-fallback" aria-hidden>
            <Film className="h-6 w-6" />
          </div>
        )}
        {item.heatScore != null && (
          <span className="radar-suggestions__heat">
            <Sparkles className="h-3 w-3" />
            {item.heatScore}
          </span>
        )}
      </div>

      <div className="radar-suggestions__body">
        <h4 className="radar-suggestions__title">{item.movieTitle}</h4>

        <p className="radar-suggestions__meta">
          <Clock className="h-3 w-3" aria-hidden />
          <span>{formatShowtime(item.startTime)}</span>
          <span className="radar-suggestions__meta-dot" aria-hidden>·</span>
          <span>còn {item.availableSeats} ghế</span>
        </p>

        <p className="radar-suggestions__cinema">
          <MapPin className="h-3 w-3" aria-hidden />
          <span>{item.cinemaName}</span>
        </p>

        {item.reasons?.length > 0 && (
          <div className="radar-suggestions__tags">
            {item.reasons.slice(0, 2).map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        )}

        <span className="radar-suggestions__book">
          <Ticket className="h-3.5 w-3.5" aria-hidden />
          Đặt vé ngay
        </span>
      </div>
    </Link>
  );
};

const ShowtimeRadarSuggestionsList = ({
  suggestions = [],
  loading = false,
  emptyMessage = 'Chưa có suất phù hợp trong 48 giờ tới.',
  maxItems = 5,
  variant = 'strip',
}) => {
  const { ref: dragScrollRef, dragScrollProps } = useDragScroll();
  const isStrip = variant === 'strip';

  if (loading) {
    return (
      <div className={`radar-suggestions radar-suggestions--${variant} radar-suggestions--loading`}>
        <Loader2 className="h-5 w-5 animate-spin showtime-radar-widget__icon-accent" />
        <span>Đang quét suất chiếu...</span>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <p className={`radar-suggestions radar-suggestions--${variant} radar-suggestions--empty`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      ref={isStrip ? dragScrollRef : undefined}
      className={`radar-suggestions radar-suggestions--${variant}${isStrip ? ' radar-suggestions--drag-scroll' : ''}`}
      {...(isStrip ? dragScrollProps : {})}
    >
      <AnimatePresence mode="popLayout">
        {suggestions.slice(0, maxItems).map((item, index) => (
          <motion.div
            key={item.showtimeUuid}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, delay: index * 0.05 }}
            className="radar-suggestions__slide"
          >
            <RadarSuggestionCard item={item} variant={variant} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ShowtimeRadarSuggestionsList;
