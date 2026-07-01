import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, LogIn, Radar, RefreshCw, Settings2 } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import useShowtimeRadar from '../hooks/useShowtimeRadar';
import ShowtimeRadarSuggestionsList from './ShowtimeRadarSuggestionsList';
import './ShowtimeRadarWidget.css';
import './ProfilePreferencesTab.css';

const ShowtimeRadarWidget = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  const {
    loading,
    refreshing,
    enabled,
    suggestions,
    emptyMessage,
    refreshSuggestions,
  } = useShowtimeRadar();

  if (!isAuthenticated) {
    return (
      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.55 }}
        className="showtime-radar-widget showtime-radar-widget--guest"
      >
        <div className="showtime-radar-widget__glow" aria-hidden />
        <div className="showtime-radar-widget__header">
          <div className="showtime-radar-widget__title-row">
            <Radar className="h-5 w-5 text-sky-400" />
            <span className="showtime-radar-widget__kicker">Smart Showtime Radar</span>
          </div>
          <p className="showtime-radar-widget__subtitle">
            Gợi ý suất chiếu trong 48 giờ tới theo sở thích của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="showtime-radar-widget__login-btn"
        >
          <LogIn className="h-4 w-4" />
          Đăng nhập để xem Radar
        </button>
      </motion.aside>
    );
  }

  const hasSuggestions = suggestions.length > 0;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55 }}
      className="showtime-radar-widget"
    >
      <div className="showtime-radar-widget__glow" aria-hidden />

      <div className="showtime-radar-widget__header">
        <div className="showtime-radar-widget__title-row">
          <Radar className="h-5 w-5 text-sky-400" />
          <span className="showtime-radar-widget__kicker">Smart Showtime Radar</span>
        </div>
        <p className="showtime-radar-widget__subtitle">
          Quét 48h · {enabled ? 'đang bật' : 'chưa bật'}
        </p>
      </div>

      <div className="showtime-radar-widget__toolbar">
        <Link
          to="/profile"
          state={{ tab: 'preferences' }}
          className="showtime-radar-widget__settings-link"
        >
          <Settings2 className="h-4 w-4" />
          Cấu hình sở thích
        </Link>
        {(enabled || hasSuggestions) && (
          <button
            type="button"
            className="showtime-radar-widget__icon-btn"
            onClick={refreshSuggestions}
            disabled={refreshing || loading}
            aria-label="Làm mới gợi ý"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!enabled && !hasSuggestions ? (
        <p className="showtime-radar-widget__empty">
          Chưa có gợi ý. Vào{' '}
          <Link to="/profile" state={{ tab: 'preferences' }} className="showtime-radar-widget__inline-link">
            Sở thích
          </Link>{' '}
          trên Profile để cấu hình và bật Radar.
        </p>
      ) : (
        <ShowtimeRadarSuggestionsList
          suggestions={suggestions}
          loading={loading}
          variant="widget"
          maxItems={4}
          emptyMessage={emptyMessage}
        />
      )}
    </motion.aside>
  );
};

export default ShowtimeRadarWidget;
