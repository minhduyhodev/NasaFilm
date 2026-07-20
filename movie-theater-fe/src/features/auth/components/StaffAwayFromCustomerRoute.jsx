import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { getDefaultAdminPath, isAdminOrStaffUser } from '../../../shared/utils/adminNavigation';

/**
 * Chặn admin/staff khỏi toàn bộ site khách hàng.
 * Gõ URL `/`, `/movies`, `/profile`… sẽ bị đẩy về cổng quản trị.
 */
export const StaffAwayFromCustomerRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && isAdminOrStaffUser(user)) {
    return <Navigate to={getDefaultAdminPath(user)} replace />;
  }

  if (children) return <>{children}</>;
  return <Outlet />;
};

export default StaffAwayFromCustomerRoute;
