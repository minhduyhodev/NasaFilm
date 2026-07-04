import {
  BOOKING_SESSION_KEYS,
  writeBookingSession,
} from '../../../shared/utils/bookingSessionStorage';
import {
  formatShowtimeDate,
  formatShowtimeLabel,
} from '../../../shared/utils/orbitUtils';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function metaFromRoom(room) {
  if (!room) return {};
  return {
    theater: room.theater || '',
    movie: room.movieTitle || '',
    movieUuid: room.movieUuid || '',
    moviePoster: room.moviePoster || '',
    date: formatShowtimeDate(room.showtimeStartTime),
    showtime: formatShowtimeLabel(room.showtimeStartTime),
  };
}

export function persistOrbitMeta(meta) {
  writeBookingSession(BOOKING_SESSION_KEYS.ORBIT, meta);
}

export function resolveLockExpiresAt(mapData) {
  if (!mapData?.rows) return null;
  const offset = mapData._serverTimeOffset || 0;
  let expiresAtVal = null;
  mapData.rows.forEach((row) => {
    row.seats.forEach((seat) => {
      if ((seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') && seat.lockedUntil) {
        const seatExpire = new Date(seat.lockedUntil).getTime() - offset;
        if (!expiresAtVal || seatExpire > expiresAtVal) expiresAtVal = seatExpire;
      }
    });
  });
  if (!expiresAtVal) return null;
  const serverTime = mapData.serverTime ? new Date(mapData.serverTime).getTime() : Date.now();
  return serverTime + Math.max(0, expiresAtVal - serverTime);
}
