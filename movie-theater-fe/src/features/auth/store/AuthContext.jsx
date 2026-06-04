import React, { createContext, useEffect, useCallback } from 'react';
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
    async (credentials) => {
      setLoading(true);
      setError(null);
      console.log("[AuthContext] Bắt đầu gọi login callback cho:", credentials.email);
      try {
        const response = await authService.login(credentials);
        console.log("[AuthContext] Đăng nhập thành công, thiết lập user state cho:", response.user?.email);
        setUser(response.user);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Login failed';
        console.error("[AuthContext] Đăng nhập callback thất bại:", errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setUser]
  );

  const register = useCallback(
    async (credentials) => {
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
    console.log("[AuthContext] Khởi động quá trình đăng xuất người dùng...");
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[AuthContext] Lỗi xảy ra khi đăng xuất:', err);
    } finally {
      setUser(null);
      setError(null);
      console.log("[AuthContext] Hoàn tất quá trình đăng xuất, reset user state về null.");
    }
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
