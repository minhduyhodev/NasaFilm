import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './features/auth/store/AuthContext';
import { AuthRoutes } from './features/auth/routes/index.jsx';
import { HomeRoutes } from './features/home/routes/index.jsx';
import { AdminRoutes } from './features/admin/routes/index.jsx';
import { CounterRoutes } from './features/counter/index.js';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.jsx';
import { PublicRoute } from './features/auth';
import { NotificationProvider } from './shared/context/NotificationContext';
import { QueryProvider } from './app/providers/QueryProvider';
import { GlobalStyles } from './app/styles/GlobalStyles';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { ToastViewport } from './app/components/ToastViewport';
import { initMediaUrlRouting } from './shared/utils/mediaUrlUtils';
import './index.css';

const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'));
const UnauthorizedPage = lazy(() => import('./features/auth/pages/UnauthorizedPage'));

const AuthPageLoader = () => (
  <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500" />
  </div>
);

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
        <QueryProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Suspense fallback={<AuthPageLoader />}>
                      <LoginPage />
                    </Suspense>
                  </PublicRoute>
                }
              />

              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Suspense fallback={<AuthPageLoader />}>
                      <RegisterPage />
                    </Suspense>
                  </PublicRoute>
                }
              />

              <Route path="/forgot-password" element={<AuthRoutes mode="forgot-password" />} />
              <Route path="/reset-password" element={<AuthRoutes mode="reset-password" />} />
              <Route path="/activate-account" element={<AuthRoutes mode="activate-account" />} />

              <Route path="/auth/*" element={<AuthRoutes />} />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminRoutes />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/counter/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <CounterRoutes />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/unauthorized"
                element={
                  <Suspense fallback={<AuthPageLoader />}>
                    <UnauthorizedPage />
                  </Suspense>
                }
              />

              <Route path="/*" element={<HomeRoutes />} />
            </Routes>
          </NotificationProvider>

          <ToastViewport />
        </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
