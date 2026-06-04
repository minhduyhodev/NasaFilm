import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './features/auth/store/AuthContext';
import { AuthRoutes } from './features/auth/routes';
import { HomeRoutes } from './features/home';
import { AdminRoutes } from './features/admin/routes';
import { ProtectedRoute } from './features/auth';
import { GlobalStyles } from './app/styles/GlobalStyles';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

export default function App() {
  return (
    <ErrorBoundary>
      <GlobalStyles />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth routes */}
            <Route path="/auth/*" element={<AuthRoutes />} />

            {/* Home routes */}
            <Route path="/" element={<HomeRoutes />} />

            {/* Admin routes — chỉ ADMIN và STAFF mới được vào */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <AdminRoutes />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast notifications */}
          <ToastContainer
            position="bottom-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            style={{
              '--toastContainer-width': '360px',
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
