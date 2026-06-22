import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from '../components/PublicRoute';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ActivateAccountPage from '../pages/ActivateAccountPage';

export const AuthRoutes = ({ mode }) => {
  if (mode === 'forgot-password') {
    return (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    );
  }

  if (mode === 'reset-password') {
    return (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    );
  }

  if (mode === 'activate-account') {
    return (
      <PublicRoute>
        <ActivateAccountPage />
      </PublicRoute>
    );
  }

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
        element={<Navigate to="/forgot-password" replace />}
      />
      <Route
        path="reset-password"
        element={<Navigate to="/reset-password" replace />}
      />
    </Routes>
  );
};
