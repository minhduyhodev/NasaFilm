import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

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

const ShowtimeRadarSuggestionsList = ({
  suggestions = [],
  loading = false,
  emptyMessage = 'Chưa có suất phù hợp trong 48 giờ tới.',
  maxItems = 5,
  variant = 'widget',
}) => {
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
    <ul className={`radar-suggestions radar-suggestions--${variant}`}>
      <AnimatePresence mode="popLayout">
        {suggestions.slice(0, maxItems).map((item, index) => (
          <motion.li
            key={item.showtimeUuid}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="radar-suggestions__item"
          >
            <div className="radar-suggestions__head">
              <p className="radar-suggestions__title">{item.movieTitle}</p>
              {item.heatScore != null && (
                <span className="radar-suggestions__heat">
                  <Sparkles className="h-3 w-3" />
                  {item.heatScore}
                </span>
              )}
            </div>
            <p className="radar-suggestions__meta">
              {formatShowtime(item.startTime)} · còn {item.availableSeats} ghế · {item.cinemaName}
            </p>
            {item.reasons?.length > 0 && (
              <div className="radar-suggestions__tags">
                {item.reasons.slice(0, 2).map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            )}
            <Link
              to={`/movie/${item.movieUuid}#select-showtimes`}
              className="radar-suggestions__book"
            >
              Đặt vé ngay
            </Link>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
};

export default ShowtimeRadarSuggestionsList;
