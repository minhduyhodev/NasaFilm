import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_ROOM_TYPES,
  DEFAULT_SCREENING_FORMATS,
  SYSTEM_CONFIG_STORAGE_KEY,
} from '../constants/systemConfig';

export function mergeSystemConfig(saved) {
  const merged = { ...DEFAULT_SYSTEM_CONFIG, ...(saved || {}) };
  if (!Array.isArray(merged.roomTypes) || merged.roomTypes.length === 0) {
    merged.roomTypes = DEFAULT_ROOM_TYPES;
  }
  if (!Array.isArray(merged.screeningFormats) || merged.screeningFormats.length === 0) {
    merged.screeningFormats = DEFAULT_SCREENING_FORMATS;
  }
  return merged;
}

export function readCachedSystemConfig() {
  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SYSTEM_CONFIG };
    return mergeSystemConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SYSTEM_CONFIG };
  }
}

export function writeCachedSystemConfig(config) {
  localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function getDefaultOnlineStreamingPrice(config = readCachedSystemConfig()) {
  const price = Number(config.onlineStreamingPrice);
  return Number.isFinite(price) && price >= 0
    ? price
    : DEFAULT_SYSTEM_CONFIG.onlineStreamingPrice;
}

export function resolveMovieOnlinePrice(movie, config = readCachedSystemConfig()) {
  if (movie?.onlinePrice != null && movie.onlinePrice !== '') {
    return Number(movie.onlinePrice);
  }
  return getDefaultOnlineStreamingPrice(config);
}

export function getMaxSeatsPerBooking(config = readCachedSystemConfig()) {
  const max = Number(config.maxSeatsPerBooking);
  return Number.isFinite(max) && max >= 1 ? max : DEFAULT_SYSTEM_CONFIG.maxSeatsPerBooking;
}

export function getEnabledRoomTypes(config = readCachedSystemConfig()) {
  const types = Array.isArray(config.roomTypes) ? config.roomTypes : DEFAULT_ROOM_TYPES;
  return types.filter((t) => t.enabled !== false);
}

export function getRoomTypeLabel(value, config = readCachedSystemConfig()) {
  const types = Array.isArray(config.roomTypes) ? config.roomTypes : DEFAULT_ROOM_TYPES;
  const match = types.find((t) => t.value === value);
  return match?.label || value;
}

export function getPointsToCashValue(config = readCachedSystemConfig()) {
  const value = Number(config.pointsToCashValue);
  return Number.isFinite(value) && value >= 1
    ? value
    : DEFAULT_SYSTEM_CONFIG.pointsToCashValue;
}
