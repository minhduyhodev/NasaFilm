import {
  DEFAULT_NASA_BOT_CONFIG,
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
  merged.nasaBot = normalizeNasaBotConfig(merged.nasaBot);
  return merged;
}

export function normalizeNasaBotConfig(config) {
  const bot = { ...DEFAULT_NASA_BOT_CONFIG, ...(config || {}) };
  bot.shortcuts = Array.isArray(bot.shortcuts) ? bot.shortcuts : [];
  bot.shortcuts = bot.shortcuts
    .map((item, index) => ({
      buttonName: item?.buttonName || item?.label || `Shortcut ${index + 1}`,
      shortcutName: item?.shortcutName || item?.id || `custom_${index + 1}`,
      description: item?.description || '',
      queryContent: item?.queryContent || item?.description || item?.buttonName || item?.label || 'Tôi cần được hỗ trợ.',
    }))
    .filter((item) => item.buttonName.trim());
  bot.openingQuestions = Array.isArray(bot.openingQuestions) ? bot.openingQuestions.filter(Boolean) : [];
  if (!bot.title) bot.title = DEFAULT_NASA_BOT_CONFIG.title;
  if (!bot.subtitle) bot.subtitle = DEFAULT_NASA_BOT_CONFIG.subtitle;
  if (!bot.personaPrompt) bot.personaPrompt = DEFAULT_NASA_BOT_CONFIG.personaPrompt;
  if (!Array.isArray(bot.shortcuts) || bot.shortcuts.length === 0) {
    bot.shortcuts = DEFAULT_NASA_BOT_CONFIG.shortcuts;
  }
  if (!Array.isArray(bot.openingQuestions) || bot.openingQuestions.length === 0) {
    bot.openingQuestions = DEFAULT_NASA_BOT_CONFIG.openingQuestions;
  }
  return bot;
}

export function mergeSystemConfigLegacy(saved) {
  const merged = { ...DEFAULT_SYSTEM_CONFIG, ...(saved || {}) };
  merged.nasaBot = { ...DEFAULT_NASA_BOT_CONFIG, ...(merged.nasaBot || {}) };
  if (!Array.isArray(merged.nasaBot.shortcuts) || merged.nasaBot.shortcuts.length === 0) {
    merged.nasaBot.shortcuts = DEFAULT_NASA_BOT_CONFIG.shortcuts;
  }
  if (!Array.isArray(merged.nasaBot.openingQuestions) || merged.nasaBot.openingQuestions.length === 0) {
    merged.nasaBot.openingQuestions = DEFAULT_NASA_BOT_CONFIG.openingQuestions;
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

export function getOnlineCountdownSettings(config = readCachedSystemConfig()) {
  const warningMinutes = Number(config.onlineCountdownWarningMinutes);
  return {
    enabled: config.onlineCountdownEnabled !== false,
    warningMinutes:
      Number.isFinite(warningMinutes) && warningMinutes >= 1
        ? warningMinutes
        : DEFAULT_SYSTEM_CONFIG.onlineCountdownWarningMinutes,
    lockMultiplier: Number(config.onlineWatchLockMultiplier) || DEFAULT_SYSTEM_CONFIG.onlineWatchLockMultiplier,
  };
}
