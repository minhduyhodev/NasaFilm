import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyThemeToDocument,
  getSystemTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
} from './themeStorage';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  isLight: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
      return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    }
    return readStoredTheme();
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        /* ignore */
      }
      setThemeState(getSystemTheme());
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'light' ? 'light' : 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
