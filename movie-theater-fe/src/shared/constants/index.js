/**
 * Application constants
 */

export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  PUBLIC: {
    HOME: '/',
  },
};

export const API = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_NAME_LENGTH: 2,
  MIN_PHONE_LENGTH: 10,
};

export const TOKEN = {
  ACCESS_TOKEN_KEY: 'authToken',
  REFRESH_TOKEN_KEY: 'refreshToken',
  USER_KEY: 'auth_user',
};

export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login successful! Redirecting...',
    REGISTER: 'Account created successfully! Please log in.',
    PASSWORD_RESET: 'Password reset successful! Redirecting to login...',
    EMAIL_SENT: 'Recovery code sent! Please check your email.',
  },
  ERROR: {
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    REGISTER_FAILED: 'Registration failed. Please try again.',
    PASSWORD_RESET_FAILED: 'Password reset failed. Please try again.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PASSWORD: 'Password must be at least 8 characters.',
    INVALID_PHONE: 'Please enter a valid phone number.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Unauthorized. Please log in again.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'Resource not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
  },
};

export const ANIMATION = {
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.6,
  },
  TRANSITION: {
    EASE_IN_OUT: 'easeInOut',
    EASE_IN: 'easeIn',
    EASE_OUT: 'easeOut',
  },
};
