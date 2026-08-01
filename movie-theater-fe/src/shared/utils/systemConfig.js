import {
  DEFAULT_NASA_BOT_CONFIG,
  DEFAULT_NASA_BOT_SHORTCUTS,
  DEFAULT_NASA_BOT_CATEGORY_KEYWORDS,
  DEFAULT_NASA_BOT_BANNED_WORDS,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_ROOM_TYPES,
  DEFAULT_SCREENING_FORMATS,
  SYSTEM_CONFIG_STORAGE_KEY,
} from '../constants/systemConfig';

export function normalizeNasaBotShortcut(shortcut = {}, fallback = {}) {
  const buttonName = `${shortcut.buttonName || shortcut.label || fallback.buttonName || ''}`.trim();
  const shortcutName = `${shortcut.shortcutName || shortcut.id || fallback.shortcutName || ''}`.trim();
  const description = `${shortcut.description || fallback.description || ''}`.trim();
  const queryContent = `${shortcut.queryContent || shortcut.buttonName || shortcut.label || fallback.queryContent || ''}`.trim();

  return {
    buttonName: buttonName || fallback.buttonName || '',
    shortcutName: shortcutName || fallback.shortcutName || '',
    description: description || fallback.description || '',
    queryContent: queryContent || fallback.queryContent || buttonName || '',
  };
}


function normalizeNasaBotCategoryKeywords(categoryKeywords = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_NASA_BOT_CATEGORY_KEYWORDS).map(([category, fallbackKeywords]) => {
      const keywords = Array.isArray(categoryKeywords?.[category])
        ? categoryKeywords[category]
        : fallbackKeywords;

      return [
        category,
        keywords.map((keyword) => `${keyword || ''}`.trim()).filter(Boolean),
      ];
    }),
  );
}

function normalizeNasaBotWords(words = [], fallbackWords = []) {
  const source = Array.isArray(words) ? words : fallbackWords;
  return [...new Set(source.map((word) => `${word || ''}`.trim()).filter(Boolean))];
}
export function normalizeNasaBotConfig(config = {}) {
  const shortcuts = Array.isArray(config.shortcuts)
    ? config.shortcuts
      .map((shortcut, index) => normalizeNasaBotShortcut(shortcut, DEFAULT_NASA_BOT_SHORTCUTS[index] || {}))
      .filter((shortcut) => shortcut.buttonName && shortcut.shortcutName)
    : [];

  return {
    ...DEFAULT_NASA_BOT_CONFIG,
    ...(config || {}),
    personaPrompt: `${config?.personaPrompt || DEFAULT_NASA_BOT_CONFIG.personaPrompt}`.trim(),
    openingQuestions: Array.isArray(config?.openingQuestions)
      ? config.openingQuestions.map((item) => `${item || ''}`.trim()).filter(Boolean)
      : DEFAULT_NASA_BOT_CONFIG.openingQuestions,
    shortcuts: shortcuts.length > 0 ? shortcuts : DEFAULT_NASA_BOT_CONFIG.shortcuts,
    categoryKeywords: normalizeNasaBotCategoryKeywords(config?.categoryKeywords),
    bannedWords: normalizeNasaBotWords(config?.bannedWords, DEFAULT_NASA_BOT_BANNED_WORDS),
  };
}

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
  return Number.isInteger(max) && max >= 1 && max <= 20
    ? max
    : DEFAULT_SYSTEM_CONFIG.maxSeatsPerBooking;
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
