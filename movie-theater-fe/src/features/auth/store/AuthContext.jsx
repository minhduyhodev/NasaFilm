import React, { createContext, useCallback, useEffect } from 'react';
import { authService } from '../api/authService';
import { useLocalStorage } from '../hooks/useLocalStorage';
import tokenService from '../utils/tokenService';

export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('auth_user', null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = tokenService.getToken();
        const storedUser = tokenService.getUser();

        if (token && tokenService.isTokenExpired(token)) {
          tokenService.clear();
          setUser(null);
        } else if (token && storedUser) {
          setUser(storedUser);
        } else if (token && !storedUser) {
          tokenService.clear();
          setUser(null);
        } else {
          setUser(null);
        }
      } catch (err) {
        tokenService.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setUser]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
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
      setUser(null);
      setError(null);
    }
  }, [setUser]);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    tokenService.setUser(updatedUser);
  }, [setUser]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const token = tokenService.getToken();

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user && !!token && !tokenService.isTokenExpired(token),
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    resetError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
