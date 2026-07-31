export const THEME_STORAGE_KEY = 'nasafilm-theme';

/** @typedef {'dark' | 'light'} AppTheme */

/**
 * @returns {AppTheme}
 */
export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * @param {unknown} value
 * @returns {AppTheme | null}
 */
export function normalizeTheme(value) {
  if (value === 'light' || value === 'dark') return value;
  return null;
}

/**
 * @returns {AppTheme}
 */
export function readStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)) || getSystemTheme();
  } catch {
    return getSystemTheme();
  }
}

/**
 * @param {AppTheme} theme
 */
export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', next === 'light' ? '#f4f5f7' : '#0f172a');
  }
}

/**
 * @param {AppTheme} theme
 */
export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
