import React from 'react';
import { Rocket } from 'lucide-react';
import OrbitBookingTimers from './OrbitBookingTimers';

const OrbitBookingHeader = ({
  displayMovie,
  displayTheater,
  displayDate,
  displayShowtime,
  roomStatus,
  expiresAt,
  lockTimeLeft,
  showLockTimer,
}) => (
  <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <span className="orbit-booking__hero-badge mb-3">
        <Rocket className="w-3.5 h-3.5" />
        Orbit Seat
      </span>
      <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
        {displayMovie}
      </h1>
      <p className="text-sm text-zinc-400 mt-1">
        {[displayTheater, displayDate, displayShowtime].filter(Boolean).join(' · ')
          || 'Đang tải thông tin suất chiếu…'}
      </p>
    </div>
    <OrbitBookingTimers
      roomStatus={roomStatus}
      expiresAt={expiresAt}
      lockTimeLeft={lockTimeLeft}
      showLockTimer={showLockTimer}
    />
  </header>
);

export default React.memo(OrbitBookingHeader);
