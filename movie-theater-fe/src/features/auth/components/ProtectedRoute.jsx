import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { hasAnyPermission } from '../../../shared/utils/permissions';
import { getDefaultAdminPath, isAdminOrStaffUser } from '../../../shared/utils/adminNavigation';

const needsElevatedAccess = (allowedRoles = []) =>
  allowedRoles.some((role) => role === 'admin' || role === 'staff');

export const ProtectedRoute = ({
  children,
  allowedRoles,
  blockedRoles,
  requiredPermissions,
}) => {
  const { isAuthenticated, loading, user, sessionVerified, syncSession } = useAuthContext();
  const location = useLocation();
  const [elevatedCheckDone, setElevatedCheckDone] = useState(!needsElevatedAccess(allowedRoles));

  // Re-verify roles from backend before rendering admin/staff routes.
  // Prevents localStorage role spoofing via DevTools after login as a customer.
  useEffect(() => {
    if (!needsElevatedAccess(allowedRoles)) {
      setElevatedCheckDone(true);
      return undefined;
    }

    let cancelled = false;
    setElevatedCheckDone(false);

    (async () => {
      try {
        await syncSession();
      } finally {
        if (!cancelled) {
          setElevatedCheckDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowedRoles, location.pathname, syncSession]);

  // Hiển thị spinner khi đang load auth state / re-verify admin session
  if (loading || (needsElevatedAccess(allowedRoles) && !elevatedCheckDone)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chưa đăng nhập → về trang login, lưu lại đường dẫn hiện tại
  if (!isAuthenticated || !sessionVerified) {
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

  // Admin/staff bị chặn khỏi luồng khách → về cổng quản trị (không kẹt /unauthorized rồi bấm về home)
  if (blockedRoles && blockedRoles.length > 0) {
    const userRoles = user?.roles ?? [];
    const isBlocked = blockedRoles.some((role) => userRoles.includes(role));
    if (isBlocked) {
      if (isAdminOrStaffUser(user)) {
        return <Navigate to={getDefaultAdminPath(user)} replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  const normalizedPermissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : requiredPermissions
      ? [requiredPermissions]
      : [];

  if (normalizedPermissions.length > 0 && !hasAnyPermission(user, normalizedPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
