/**
 * Common types used across the application
 */

// Roles matching BE RoleName enum: ADMIN | STAFF | CUSTOMER (mapped to 'user')
export type UserRole = 'user' | 'admin' | 'staff';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface SuccessResponse {
  success: true;
  message: string;
}

export interface FailureResponse {
  success: false;
  error: string;
  details?: ValidationError[];
}
