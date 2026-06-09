import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from '../components/PublicRoute';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

export const AuthRoutes = () => {
  return (
    <Routes>
      <Route
        path="login"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="register"
        element={<Navigate to="/register" replace />}
      />
      <Route
        path="forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="reset-password"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />
    </Routes>
  );
};
