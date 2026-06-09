import axios from 'axios';
import tokenService from '../utils/tokenService';
import { resolveAvatarUrl } from '../../../shared/utils/avatarUrl';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const mapBackendRoles = (roles = []) => {
  return roles.map((role) => {
    const normalized = role.toUpperCase();
    if (normalized === 'ADMIN' || normalized.includes('ADMIN')) return 'admin';
    if (normalized === 'STAFF' || normalized.includes('STAFF')) return 'staff';
    return 'user';
  });
};

const buildAuthResponse = (jwtData) => ({
  user: {
    id: jwtData.userId,
    fullName: jwtData.fullName,
    email: jwtData.email,
    avatar: resolveAvatarUrl(jwtData),
    roles: mapBackendRoles(jwtData.roles ?? []),
  },
  token: jwtData.accessToken,
  tokenType: jwtData.tokenType,
  refreshToken: jwtData.refreshToken,
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

class AuthService {
  api;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = tokenService.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url ?? '';
        const isAuthRequest =
          requestUrl.includes('/api/auth/login') ||
          requestUrl.includes('/api/auth/google') ||
          requestUrl.includes('/api/auth/refresh') ||
          requestUrl.includes('/api/auth/register');

        if (error.response?.status === 401 && !isAuthRequest && originalRequest && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              subscribeTokenRefresh((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const newAccessToken = await this.refreshToken();
            isRefreshing = false;
            onRefreshed(newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = [];
            tokenService.clear();
            sessionStorage.setItem('auth_expired', 'true');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 401 && !isAuthRequest) {
          tokenService.clear();
          sessionStorage.setItem('auth_expired', 'true');
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials) {
    try {
      const response = await this.api.post('/api/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const jwtData = response.data.data ?? response.data;
      const authResponse = buildAuthResponse(jwtData);

      tokenService.setToken(authResponse.token);
      if (authResponse.refreshToken) {
        tokenService.setRefreshToken(authResponse.refreshToken);
      }
      tokenService.setUser(authResponse.user);

      if (credentials.rememberMe) {
        localStorage.setItem('rememberEmail', credentials.email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      return authResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async loginWithGoogle({ idToken }) {
    try {
      const response = await this.api.post('/api/auth/google', { idToken });
      const jwtData = response.data.data ?? response.data;
      const authResponse = buildAuthResponse(jwtData);

      tokenService.setToken(authResponse.token);
      if (authResponse.refreshToken) {
        tokenService.setRefreshToken(authResponse.refreshToken);
      }
      tokenService.setUser(authResponse.user);

      return authResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(credentials) {
    try {
      console.log("[AuthService] Gửi yêu cầu đăng ký cho email:", credentials.email);
      const response = await this.api.post('/api/auth/register', {
        email: credentials.email,
        password: credentials.password,
        fullName: credentials.fullName,
        phoneNumber: credentials.phoneNumber || null,
        dayOfBirth: credentials.dayOfBirth,
        gender: credentials.gender,
      });
      return response.data;
    } catch (error) {
      console.error("[AuthService] Đăng ký thất bại. Lỗi:", error.message || error);
      throw this.handleError(error);
    }
  }

  async verifyRegister(email, code) {
    try {
      console.log("[AuthService] Gửi yêu cầu xác thực OTP đăng ký cho email:", email);
      const response = await this.api.post('/api/auth/register/verify', {
        email,
        code,
      });
      return response.data;
    } catch (error) {
      console.error("[AuthService] Xác thực OTP thất bại. Lỗi:", error.message || error);
      throw this.handleError(error);
    }
  }

  async loginWithApple(_) {
    throw new Error('Social login is not supported by the current backend version.');
  }

  async forgotPassword({ email }) {
    try {
      const response = await this.api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword({ token, password }) {
    try {
      const response = await this.api.post('/api/auth/reset-password', {
        token,
        newPassword: password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshToken() {
    try {
      const currentRefreshToken = tokenService.getRefreshToken();
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken: currentRefreshToken }
      );

      const jwtData = response.data.data ?? response.data;
      const authResponse = buildAuthResponse(jwtData);

      tokenService.setToken(authResponse.token);
      tokenService.setRefreshToken(authResponse.refreshToken);
      tokenService.setUser(authResponse.user);

      return authResponse.token;
    } catch (error) {
      tokenService.clear();
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      await this.api.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.warn('Server logout failed, clearing local session anyway:', error);
    } finally {
      window.google?.accounts?.id?.disableAutoSelect?.();
      tokenService.clear();
    }
  }

  async getProfile() {
    try {
      const response = await this.api.get('/api/user/profile');
      return response.data.data ?? response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await this.api.put('/api/user/profile', profileData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await this.api.post('/api/user/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (axios.isAxiosError(error)) {
      const beMessage =
        error.response?.data?.message ||
        error.response?.data?.data?.message ||
        error.message;
      return new Error(beMessage);
    }
    return error instanceof Error ? error : new Error('An unexpected error occurred');
  }
}

export const authService = new AuthService();
