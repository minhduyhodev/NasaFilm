import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatOrbitStatus } from '../../../shared/utils/orbitUtils';

const OrbitBookingTimers = React.memo(({
  roomStatus,
  expiresAt,
  lockTimeLeft,
  showLockTimer,
}) => {
  const [roomExpiresIn, setRoomExpiresIn] = useState(null);

  useEffect(() => {
    if (!expiresAt) {
      setRoomExpiresIn(null);
      return undefined;
    }
    const tick = () => {
      const sec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRoomExpiresIn(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const statusClass = roomStatus === 'OPEN'
    ? 'orbit-booking__status--open'
    : roomStatus === 'CHECKOUT'
      ? 'orbit-booking__status--checkout'
      : 'orbit-booking__status--closed';

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
      {roomStatus && (
        <span className={`orbit-booking__status ${statusClass}`}>{formatOrbitStatus(roomStatus)}</span>
      )}
      {roomExpiresIn !== null && (
        <span className="flex items-center gap-1.5 text-zinc-400">
          <Clock className="w-4 h-4" />
          Phòng:
          {' '}
          {Math.floor(roomExpiresIn / 60)}
          :
          {String(roomExpiresIn % 60).padStart(2, '0')}
        </span>
      )}
      {showLockTimer && lockTimeLeft !== null && (
        <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <Clock className="w-4 h-4" />
          Giữ ghế:
          {' '}
          {Math.floor(lockTimeLeft / 60)}
          :
          {String(lockTimeLeft % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  );
});

OrbitBookingTimers.displayName = 'OrbitBookingTimers';

export default OrbitBookingTimers;
