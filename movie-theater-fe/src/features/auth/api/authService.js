import axios from 'axios';
import tokenService from '../utils/tokenService';
import { resolveAvatarUrl } from '../../../shared/utils/avatarUrl';
import { logger } from '../../../shared/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/** Các API công khai — không redirect /login khi token hết hạn. */
const PUBLIC_API_PREFIXES = [
  '/api/movies',
  '/api/showtimes',
  '/api/genres',
  '/api/countries',
  '/api/actors',
  '/api/cinemas',
  '/api/combos/active',
  '/api/system-config',
  '/api/promotions/public',
  '/api/promotions/validate',
  '/api/review-vibe-tags',
  '/api/search',
  '/api/media/proxy',
  '/api/orbit-rooms/feature-status',
  '/api/support-ai/chat',
  '/api/support-ai/status',
  '/api/support-live/availability',
];

const isPublicApiRequest = (url = '') =>
  PUBLIC_API_PREFIXES.some((prefix) => url.includes(prefix));

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
    permissions: jwtData.permissions ?? [],
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
      withCredentials: true,
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
          requestUrl.includes('/api/login') ||
          requestUrl.includes('/api/google') ||
          requestUrl.includes('/api/refresh') ||
          requestUrl.includes('/api/register');

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
            if (!isPublicApiRequest(requestUrl)) {
              sessionStorage.setItem('auth_expired', 'true');
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 401 && !isAuthRequest) {
          tokenService.clear();
          if (!isPublicApiRequest(requestUrl)) {
            sessionStorage.setItem('auth_expired', 'true');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials) {
    try {
      const response = await this.api.post('/api/login', {
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
      const response = await this.api.post('/api/google', { idToken });
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
      logger.info("[AuthService] Gửi yêu cầu đăng ký.");
      const response = await this.api.post('/api/register', {
        email: credentials.email,
        password: credentials.password,
        fullName: credentials.fullName,
        phoneNumber: credentials.phoneNumber || null,
        dayOfBirth: credentials.dayOfBirth,
        gender: credentials.gender,
      });
      return response.data;
    } catch (error) {
      logger.error("[AuthService] Đăng ký thất bại. Lỗi:", error.message || error);
      throw this.handleError(error);
    }
  }

  async verifyRegister(email, code) {
    try {
      logger.info("[AuthService] Gửi yêu cầu xác thực OTP đăng ký.");
      const response = await this.api.post('/api/register/verify', {
        email,
        code,
      });
      return response.data;
    } catch (error) {
      logger.error("[AuthService] Xác thực OTP thất bại. Lỗi:", error.message || error);
      throw this.handleError(error);
    }
  }

  async loginWithApple(_) {
    throw new Error('Social login is not supported by the current backend version.');
  }

  async forgotPassword({ email }) {
    try {
      const response = await this.api.post('/api/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword({ token, password }) {
    try {
      const response = await this.api.post('/api/reset-password', {
        token,
        newPassword: password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async activateAccount({ token, temporaryPassword, password }) {
    try {
      const response = await this.api.post('/api/activate-account', {
        token,
        temporaryPassword,
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
        `${API_BASE_URL}/api/refresh`,
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
      await this.api.post('/api/logout', { refreshToken });
    } catch (error) {
      logger.warn('Server logout failed, clearing local session anyway:', error);
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
          'Content-Type': undefined,
        },
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const beMessage = data?.message || data?.data?.message;

      if (typeof beMessage === 'string' && beMessage.trim()) {
        return new Error(beMessage.trim());
      }

      if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const firstFieldMessage = Object.values(data.data).find((value) => typeof value === 'string');
        if (firstFieldMessage) {
          return new Error(firstFieldMessage);
        }
      }

      // Không nhận được phản hồi từ server (mất kết nối / backend chưa chạy / CORS).
      if (!error.response) {
        return new Error('Không kết nối được máy chủ. Kiểm tra backend có đang chạy không rồi thử lại.');
      }

      return new Error('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
    return error instanceof Error ? error : new Error('Đã xảy ra lỗi. Vui lòng thử lại.');
  }
}

export const authService = new AuthService();
