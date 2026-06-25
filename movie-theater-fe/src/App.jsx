import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './features/auth/store/AuthContext';
import { AuthRoutes } from './features/auth/routes/index.jsx';
import { HomeRoutes } from './features/home/routes/index.jsx';
import { AdminRoutes } from './features/admin/routes/index.jsx';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.jsx';
import { UnauthorizedPage, LoginPage, RegisterPage, PublicRoute } from './features/auth';
import { NotificationProvider } from './shared/context/NotificationContext';
import { GlobalStyles } from './app/styles/GlobalStyles';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { ToastViewport } from './app/components/ToastViewport';
import { initMediaUrlRouting } from './shared/utils/mediaUrlUtils';
import './index.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    initMediaUrlRouting();
  }, []);

  return (
    <ErrorBoundary>
      <GlobalStyles />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
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
              <Route path="/activate-account" element={<AuthRoutes mode="activate-account" />} />

              {/* Legacy auth routes */}
              <Route path="/auth/*" element={<AuthRoutes />} />

              {/* Admin routes — chỉ ADMIN và STAFF mới được vào */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminRoutes />
                  </ProtectedRoute>
                }
              />

              {/* Unauthorized — must be before /* splat */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Home routes */}
              <Route path="/*" element={<HomeRoutes />} />
            </Routes>
          </NotificationProvider>

          <ToastViewport />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
