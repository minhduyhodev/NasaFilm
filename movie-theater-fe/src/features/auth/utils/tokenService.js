/**
 * Token management utilities for authentication
 */

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'auth_user';

export const tokenService = {
  /**
   * Get the access token from localStorage
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Set the access token in localStorage
   */
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * Get the refresh token from localStorage
   */
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Set the refresh token in localStorage
   */
  setRefreshToken: (token) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Get the user from localStorage
   */
  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Set the user in localStorage
   */
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Clear all auth data from localStorage
   */
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) {
        return false;
      }
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  },
};

export default tokenService;
