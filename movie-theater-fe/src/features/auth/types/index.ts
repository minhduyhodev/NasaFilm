import type { UserRole } from '../../../shared/types/common';

export interface User {
  email: string;
  roles: UserRole[];
  fullName?: string;
  avatar?: string;
  id?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  tokenType: string;
  refreshToken?: string;
}

export interface JwtResponse {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  email: string;
  roles: string[];
  userId: string;
  fullName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetError: () => void;
}
