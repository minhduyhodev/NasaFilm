import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Radar, RefreshCw, Settings2 } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useShowtimeRadarWidget } from '../hooks/useShowtimeRadarQuery';
import ShowtimeRadarSuggestionsList from './ShowtimeRadarSuggestionsList';
import './ShowtimeRadarWidget.css';

const RADAR_TITLE = 'Radar Suất Chiếu';

const ShowtimeRadarWidget = ({ layout = 'bar', embedded = false }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  const {
    loading,
    refreshing,
    enabled,
    suggestions,
    emptyMessage,
    refreshSuggestions,
  } = useShowtimeRadarWidget();

  if (!isAuthenticated) {
    return (
      <aside
        className={`showtime-radar-widget showtime-radar-widget--guest showtime-radar-widget--${layout}`}
      >
        <div className="showtime-radar-widget__glow" aria-hidden />
        <div className="showtime-radar-widget__bar-head">
          {!embedded ? (
            <div className="showtime-radar-widget__header">
              <div className="showtime-radar-widget__title-row">
                <Radar className="h-5 w-5 showtime-radar-widget__icon-accent" />
                <span className="showtime-radar-widget__kicker">{RADAR_TITLE}</span>
              </div>
              <p className="showtime-radar-widget__subtitle">
                Gợi ý suất chiếu trong 48 giờ tới theo sở thích của bạn.
              </p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="showtime-radar-widget__login-btn"
        >
          <LogIn className="h-4 w-4" />
          Đăng nhập để xem Radar
        </button>
      </aside>
    );
  }

  const hasSuggestions = suggestions.length > 0;

  return (
    <aside
      className={`showtime-radar-widget showtime-radar-widget--${layout}`}
    >
      <div className="showtime-radar-widget__glow" aria-hidden />

      <div className={`showtime-radar-widget__bar-head${embedded ? ' showtime-radar-widget__bar-head--embedded' : ''}`}>
        {!embedded ? (
          <div className="showtime-radar-widget__header">
            <div className="showtime-radar-widget__title-row">
              <Radar className="h-5 w-5 showtime-radar-widget__icon-accent" />
              <span className="showtime-radar-widget__kicker">{RADAR_TITLE}</span>
            </div>
            <p className="showtime-radar-widget__subtitle">
              Quét 48h · {enabled ? 'đang bật' : 'chưa bật'}
            </p>
          </div>
        ) : (
          <p className="showtime-radar-widget__embedded-status">
            Quét 48h · {enabled ? 'đang bật' : 'chưa bật'}
          </p>
        )}

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
          variant="strip"
          maxItems={embedded ? 3 : 6}
          emptyMessage={emptyMessage}
        />
      )}
    </aside>
  );
};

export default ShowtimeRadarWidget;
