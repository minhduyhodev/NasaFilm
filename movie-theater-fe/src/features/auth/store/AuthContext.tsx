import React, { createContext, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthContextType,
  User,
  LoginCredentials,
  RegisterCredentials,
} from '../types';
import { authService } from '../api/authService';
import { useLocalStorage } from '../hooks/useLocalStorage';
import tokenService from '../utils/tokenService';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('auth_user', null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
        console.error('Auth initialization failed:', err);
        tokenService.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setUser]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authService.login(credentials);
        setUser(response.user);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setUser]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setLoading(true);
      setError(null);
      try {
        await authService.register(credentials);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[AuthContext] Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  }, [setUser]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const token = tokenService.getToken();

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user && !!token && !tokenService.isTokenExpired(token),
    login,
    register,
    logout,
    resetError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
