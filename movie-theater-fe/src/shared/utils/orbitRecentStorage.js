import { ORBIT_TERMINAL_STATUSES } from './orbitUtils';

const STORAGE_KEY = 'orbit_recent_rooms_v1';
const MAX_ENTRIES = 8;

function readEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota errors */
  }
}

export function isOrbitRoomAccessible(entry) {
  if (!entry?.roomUuid || !entry?.expiresAt) return false;
  if (ORBIT_TERMINAL_STATUSES.includes(entry.status)) return false;
  return new Date(entry.expiresAt).getTime() > Date.now();
}

/** Persist room so user can re-enter after leaving (until expiry). */
export function rememberOrbitRoom(room, extras = {}) {
  const roomUuid = room?.uuid || room?.roomUuid;
  if (!roomUuid) return;

  const entry = {
    roomUuid,
    showtimeUuid: room.showtimeUuid || extras.showtimeUuid || '',
    movieUuid: room.movieUuid || extras.movieUuid || '',
    movieTitle: room.movieTitle || extras.movie || '',
    theater: room.theater || extras.theater || '',
    showtimeStartTime: room.showtimeStartTime || extras.showtimeStartTime || null,
    expiresAt: room.expiresAt,
    status: room.status,
    isHost: Boolean(room.host),
    leftAt: extras.leftAt || null,
    savedAt: Date.now(),
  };

  const next = [
    entry,
    ...readEntries().filter((item) => item.roomUuid !== entry.roomUuid),
  ].filter(isOrbitRoomAccessible);

  writeEntries(next);
}

export function markOrbitRoomLeft(roomUuid) {
  if (!roomUuid) return;
  const next = readEntries().map((entry) => (
    entry.roomUuid === roomUuid
      ? { ...entry, leftAt: Date.now() }
      : entry
  )).filter(isOrbitRoomAccessible);
  writeEntries(next);
}

export function removeOrbitRoom(roomUuid) {
  if (!roomUuid) return;
  writeEntries(readEntries().filter((entry) => entry.roomUuid !== roomUuid));
}

export function getAccessibleOrbitRooms() {
  return readEntries().filter(isOrbitRoomAccessible);
}

export function clearOrbitRecentStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getRecentOrbitRoomForShowtime(showtimeUuid) {
  if (!showtimeUuid) return null;
  return getAccessibleOrbitRooms().find((entry) => entry.showtimeUuid === showtimeUuid) || null;
}

export function buildOrbitNavigateState(entry, movieExtras = {}) {
  return {
    movieUuid: entry.movieUuid || movieExtras.movieUuid,
    movie: entry.movieTitle || movieExtras.movie,
    theater: entry.theater || movieExtras.theater,
    moviePoster: movieExtras.moviePoster,
    movieRating: movieExtras.movieRating,
    movieFormat: movieExtras.movieFormat,
    movieAgeRestriction: movieExtras.movieAgeRestriction,
    showtimeUuid: entry.showtimeUuid,
  };
}

/** Normalize API room + local recent entries into one list (API wins on duplicate). */
export function mergeOrbitRoomEntries(apiRooms = [], recentEntries = []) {
  const map = new Map();

  (apiRooms || []).forEach((room) => {
    const roomUuid = room?.uuid || room?.roomUuid;
    if (!roomUuid) return;
    map.set(roomUuid, {
      roomUuid,
      uuid: roomUuid,
      showtimeUuid: room.showtimeUuid,
      movieUuid: room.movieUuid,
      movieTitle: room.movieTitle || 'Phòng nhóm',
      theater: room.theater || '',
      showtimeStartTime: room.showtimeStartTime,
      expiresAt: room.expiresAt,
      status: room.status,
      isHost: Boolean(room.host),
      memberCount: room.memberCount,
      leftAt: null,
      source: 'active',
    });
  });

  (recentEntries || []).forEach((entry) => {
    if (!entry?.roomUuid || map.has(entry.roomUuid)) return;
    map.set(entry.roomUuid, {
      ...entry,
      uuid: entry.roomUuid,
      source: 'recent',
    });
  });

  return [...map.values()].sort(
    (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
  );
}

export function formatOrbitExpiresIn(expiresAt) {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Hết hạn';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Còn ${mins} phút`;
  const hours = Math.floor(mins / 60);
  return `Còn ${hours}h ${mins % 60}p`;
}
