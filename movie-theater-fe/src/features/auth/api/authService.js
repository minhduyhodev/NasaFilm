import axios from 'axios';
import tokenService from '../utils/tokenService';

// DEV: VITE_API_URL rỗng → baseURL = '' → Vite proxy forward /api/* → localhost:8080
// PROD: VITE_API_URL = 'https://api.example.com' → gọi thẳng
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Maps BE role names (ADMIN, STAFF, CUSTOMER) to FE role types.
 * BE RoleName enum: ADMIN | STAFF | CUSTOMER
 */
const mapBackendRoles = (roles) => {
  return roles.map((role) => {
    const normalized = role.toUpperCase();
    if (normalized === 'ADMIN' || normalized.includes('ADMIN')) return 'admin';
    if (normalized === 'STAFF' || normalized.includes('STAFF')) return 'staff';
    // CUSTOMER → 'user'
    return 'user';
  });
};

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

    // Tự động đính kèm JWT Token vào Header của mỗi request
    this.api.interceptors.request.use((config) => {
      const token = tokenService.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Axios Interceptor xử lý lỗi 401 toàn cục và tự động làm mới Access Token (Silent Refresh)
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url ?? '';
        const isAuthRequest =
          requestUrl.includes('/api/auth/login') ||
          requestUrl.includes('/api/auth/refresh') ||
          requestUrl.includes('/api/auth/register');

        // Nếu gặp lỗi 401 và không phải là request xác thực cơ bản, và chưa từng thử lại (retry)
        if (error.response?.status === 401 && !isAuthRequest && originalRequest && !originalRequest._retry) {
          if (isRefreshing) {
            // Đưa request vào hàng đợi đợi lấy token mới
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
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        // Nếu Refresh Token hết hạn hoặc các trường hợp 401 khác trên request không thuộc hàng đợi
        if (error.response?.status === 401 && !isAuthRequest) {
          tokenService.clear();
          window.location.href = '/auth/login';
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials) {
    try {
      // BE: POST /api/auth/login → ApiResponse<JwtResponse>
      const response = await this.api.post('/api/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      // BE trả về ApiResponse: { code, message, data: { accessToken, tokenType, email, roles } }
      const jwtData = response.data.data ?? response.data;

      const authResponse = {
        user: {
          id: jwtData.userId,
          fullName: jwtData.fullName,
          email: jwtData.email,
          roles: mapBackendRoles(jwtData.roles),
        },
        token: jwtData.accessToken,
        tokenType: jwtData.tokenType,
        refreshToken: jwtData.refreshToken,
      };

      // Lưu trữ thông tin xác thực
      tokenService.setToken(authResponse.token);
      if (authResponse.refreshToken) {
        tokenService.setRefreshToken(authResponse.refreshToken);
      }
      tokenService.setUser(authResponse.user);

      if (credentials.rememberMe) {
        localStorage.setItem('rememberEmail', credentials.email);
      }

      return authResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(_) {
    throw new Error('Registration is not supported by the current backend version.');
  }

  async loginWithGoogle(_) {
    throw new Error('Social login is not supported by the current backend version.');
  }

  async loginWithApple(_) {
    throw new Error('Social login is not supported by the current backend version.');
  }

  async forgotPassword(_) {
    throw new Error('Password recovery is not supported by the current backend version.');
  }

  async resetPassword(_) {
    throw new Error('Password reset is not supported by the current backend version.');
  }

  /**
   * Cấp lại Access Token từ Refresh Token hiện tại
   */
  async refreshToken() {
    try {
      const currentRefreshToken = tokenService.getRefreshToken();
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      // Gọi API trực tiếp bằng axios để tránh vòng lặp interceptor vô hạn
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken: currentRefreshToken }
      );

      const jwtData = response.data.data ?? response.data;

      // Cập nhật token và refresh token mới (Rotation)
      tokenService.setToken(jwtData.accessToken);
      tokenService.setRefreshToken(jwtData.refreshToken);
      tokenService.setUser({
        id: jwtData.userId,
        fullName: jwtData.fullName,
        email: jwtData.email,
        roles: mapBackendRoles(jwtData.roles),
      });

      return jwtData.accessToken;
    } catch (error) {
      tokenService.clear();
      throw this.handleError(error);
    }
  }

  /**
   * Gọi API POST /api/auth/logout kèm Refresh Token để vô hiệu hóa phiên ở server,
   * sau đó dọn dẹp sạch LocalStorage.
   */
  async logout() {
    try {
      const refreshToken = tokenService.getRefreshToken();
      // BE: POST /api/auth/logout — nhận Refresh Token trong Request Body để hủy phiên
      await this.api.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.warn('[AuthService] Server logout failed, clearing local session anyway:', error);
    } finally {
      tokenService.clear();
    }
  }

  /**
   * Phân tích nội dung lỗi trả về từ Backend
   */
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

