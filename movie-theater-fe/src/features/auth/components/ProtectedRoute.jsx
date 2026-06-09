import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';




export const ProtectedRoute = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, loading, user } = useAuthContext();
  const location = useLocation();

  // Hiển thị spinner khi đang load auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chưa đăng nhập → về trang login, lưu lại đường dẫn hiện tại
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Đã đăng nhập nhưng không có role phù hợp → về trang unauthorized
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles ?? [];
    const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
