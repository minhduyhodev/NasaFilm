import { DEFAULT_SYSTEM_CONFIG, SYSTEM_CONFIG_STORAGE_KEY } from '../constants/systemConfig';

export function mergeSystemConfig(saved) {
  return { ...DEFAULT_SYSTEM_CONFIG, ...(saved || {}) };
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
