import React, { createContext, useCallback, useEffect, useRef } from 'react';
import { authService } from '../api/authService';
import { useLocalStorage } from '../hooks/useLocalStorage';
import tokenService from '../utils/tokenService';
import { clearOrbitRecentStorage } from '../../../shared/utils/orbitRecentStorage';
import { clearNasaBotStorage } from '../../../shared/utils/nasaBotStorage';

export const AuthContext = createContext(undefined);

// Clear per-user local state that must not leak to the next (or anonymous) session.
const clearGuestSessionStorage = () => {
  clearOrbitRecentStorage();
  clearNasaBotStorage();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('auth_user', null);
  const [loading, setLoading] = React.useState(true);
  const [sessionVerified, setSessionVerified] = React.useState(false);
  const [error, setError] = React.useState(null);
  const syncInFlightRef = useRef(null);

  const clearSession = useCallback(() => {
    tokenService.clear();
    setUser(null);
    setSessionVerified(false);
    clearGuestSessionStorage();
  }, [setUser]);

  /**
   * Always overwrite local roles/permissions from the server.
   * localStorage auth_user must never be treated as an authority source.
   */
  const syncSession = useCallback(async () => {
    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    const run = (async () => {
      const token = tokenService.getToken();
      if (!token) {
        clearSession();
        return null;
      }

      try {
        if (tokenService.isTokenExpired(token)) {
          const refresh = tokenService.getRefreshToken();
          if (!refresh) {
            clearSession();
            return null;
          }
          await authService.refreshToken();
        }

        const serverUser = await authService.getCurrentUser();
        setUser(serverUser);
        setSessionVerified(true);
        return serverUser;
      } catch {
        clearSession();
        return null;
      }
    })();

    syncInFlightRef.current = run;
    try {
      return await run;
    } finally {
      syncInFlightRef.current = null;
    }
  }, [clearSession, setUser]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const token = tokenService.getToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            setSessionVerified(false);
            clearGuestSessionStorage();
          }
          return;
        }

        const serverUser = await syncSession();
        if (cancelled) {
          return;
        }
        if (!serverUser) {
          setUser(null);
          setSessionVerified(false);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    return () => {
      cancelled = true;
    };
  }, [clearSession, setUser, syncSession]);

  useEffect(() => {
    const refreshSoon = async () => {
      const token = tokenService.getToken();
      if (!token || tokenService.isTokenExpired(token)) {
        return;
      }
      const expiresAt = tokenService.getTokenExpiration(token);
      if (!expiresAt) {
        return;
      }
      const msLeft = expiresAt - Date.now();
      if (msLeft > 0 && msLeft < 60_000 && tokenService.getRefreshToken()) {
        try {
          await authService.refreshToken();
          await syncSession();
        } catch {
          // Next API call will trigger interceptor logout.
        }
      }
    };

    const syncExpiredSession = () => {
      const token = tokenService.getToken();
      if (!token) {
        return;
      }
      if (tokenService.isTokenExpired(token) && !tokenService.getRefreshToken()) {
        clearSession();
      }
    };

    const intervalId = window.setInterval(() => {
      refreshSoon();
      syncExpiredSession();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [clearSession, syncSession]);

  // If another tab tampers with auth_user, re-pull roles from the server.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== 'auth_user' && event.key !== 'authToken') {
        return;
      }
      if (!tokenService.getToken()) {
        clearSession();
        return;
      }
      syncSession();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clearSession, syncSession]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setSessionVerified(true);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const loginWithGoogle = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.loginWithGoogle(payload);
      setUser(response.user);
      setSessionVerified(true);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const register = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(credentials);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearGuestSessionStorage();
      setUser(null);
      setSessionVerified(false);
      setError(null);
    }
  }, [setUser]);

  const updateUser = useCallback((updatedUser) => {
    // Profile updates must never elevate roles/permissions from the client.
    setUser((prev) => {
      const next = {
        ...prev,
        ...updatedUser,
        roles: prev?.roles ?? [],
        permissions: prev?.permissions ?? [],
      };
      tokenService.setUser(next);
      return next;
    });
  }, [setUser]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const token = tokenService.getToken();

  const value = {
    user,
    loading,
    error,
    sessionVerified,
    isAuthenticated: !!user && !!token && !tokenService.isTokenExpired(token) && sessionVerified,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    syncSession,
    resetError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
