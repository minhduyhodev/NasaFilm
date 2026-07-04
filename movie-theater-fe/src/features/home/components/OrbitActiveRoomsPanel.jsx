import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { useOrbitAccessibleRooms } from '../../../shared/hooks/useOrbitAccessibleRooms';
import {
  buildOrbitNavigateState,
  formatOrbitExpiresIn,
  rememberOrbitRoom,
} from '../../../shared/utils/orbitRecentStorage';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { formatOrbitStatus, formatShowtimeDate, formatShowtimeLabel } from '../../../shared/utils/orbitUtils';
import './OrbitActiveRoomsPanel.css';

const OrbitActiveRoomsPanel = ({
  filterMovieUuid = null,
  title = 'Phòng Orbit đang chờ',
  className = '',
  compact = false,
  enabled = true,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { rooms, isLoading } = useOrbitAccessibleRooms({ enabled: enabled && isAuthenticated });

  const visibleRooms = useMemo(() => {
    const normalizeUuid = (value) => String(value || '').toLowerCase();
    const list = filterMovieUuid
      ? rooms.filter((room) => normalizeUuid(room.movieUuid) === normalizeUuid(filterMovieUuid))
      : rooms;
    return list.slice(0, compact ? 2 : 5);
  }, [rooms, filterMovieUuid, compact]);

  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (!isLoading && visibleRooms.length === 0) {
    return null;
  }

  const handleEnter = (room) => {
    const state = buildOrbitNavigateState(room);
    if (room.uuid) {
      rememberOrbitRoom(room);
    }
    navigate(`/booking/orbit/${room.roomUuid || room.uuid}`, { state });
  };

  return (
    <section className={`orbit-active-rooms ${compact ? 'orbit-active-rooms--compact' : ''} ${className}`}>
      <div className="orbit-active-rooms__header">
        <div className="orbit-active-rooms__title-wrap">
          <Users className="w-4 h-4 text-red-400" aria-hidden />
          <h2 className="orbit-active-rooms__title">{title}</h2>
        </div>
        {!compact && (
          <p className="orbit-active-rooms__hint">
            Phòng còn hiệu lực — bấm để vào lại chọn ghế hoặc thanh toán
          </p>
        )}
      </div>

      {isLoading && visibleRooms.length === 0 ? (
        <div className="orbit-active-rooms__loading">
          <Loader2 className="w-5 h-5 animate-spin text-red-400" />
        </div>
      ) : (
        <ul className="orbit-active-rooms__list">
          {visibleRooms.map((room) => {
            const showtimeLabel = room.showtimeStartTime
              ? `${formatShowtimeDate(room.showtimeStartTime)} · ${formatShowtimeLabel(room.showtimeStartTime)}`
              : '';
            return (
              <li key={room.roomUuid || room.uuid} className="orbit-active-rooms__card">
                <div className="orbit-active-rooms__card-main">
                  <div className="orbit-active-rooms__badges">
                    {room.isHost && (
                      <span className="orbit-active-rooms__badge orbit-active-rooms__badge--host">
                        <Crown className="w-3 h-3" aria-hidden />
                        Host
                      </span>
                    )}
                    {room.leftAt && (
                      <span className="orbit-active-rooms__badge orbit-active-rooms__badge--left">
                        Đã rời — vào lại
                      </span>
                    )}
                    <span className="orbit-active-rooms__badge">
                      {formatOrbitStatus(room.status)}
                    </span>
                  </div>
                  <p className="orbit-active-rooms__movie">
                    {room.movieTitle || 'Phòng đặt vé nhóm'}
                  </p>
                  {room.theater && (
                    <p className="orbit-active-rooms__meta">{room.theater}</p>
                  )}
                  {showtimeLabel && (
                    <p className="orbit-active-rooms__meta">{showtimeLabel}</p>
                  )}
                  <p className="orbit-active-rooms__expires">
                    <Clock className="w-3.5 h-3.5" aria-hidden />
                    {formatOrbitExpiresIn(room.expiresAt)}
                    {room.memberCount > 0 && (
                      <span className="orbit-active-rooms__members">
                        ·
                        {' '}
                        {room.memberCount}
                        {' '}
                        thành viên
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEnter(room)}
                  className="orbit-active-rooms__cta"
                >
                  Vào phòng
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default React.memo(OrbitActiveRoomsPanel);
