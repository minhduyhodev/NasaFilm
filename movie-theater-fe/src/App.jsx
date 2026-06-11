import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/store/AuthContext';
import { AuthRoutes } from './features/auth/routes/index.jsx';
import { HomeRoutes } from './features/home/routes/index.jsx';
import { AdminRoutes } from './features/admin/routes/index.jsx';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.jsx';
import { UnauthorizedPage, LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, PublicRoute } from './features/auth';
import { NotificationProvider } from './shared/context/NotificationContext';
import { GlobalStyles } from './app/styles/GlobalStyles';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { ToastViewport } from './app/components/ToastViewport';
import './index.css';

export default function App() {
  return (
    <ErrorBoundary>
      <GlobalStyles />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Login route */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              {/* Register route */}
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              <Route path="/forgot-password" element={<AuthRoutes mode="forgot-password" />} />
              <Route path="/reset-password" element={<AuthRoutes mode="reset-password" />} />

              {/* Legacy auth routes */}
              <Route path="/auth/*" element={<AuthRoutes />} />

              {/* Home routes */}
              <Route path="/*" element={<HomeRoutes />} />

              {/* Admin routes — chỉ ADMIN và STAFF mới được vào */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminRoutes />
                  </ProtectedRoute>
                }
              />

              {/* Unauthorized page */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>

          <ToastViewport />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
