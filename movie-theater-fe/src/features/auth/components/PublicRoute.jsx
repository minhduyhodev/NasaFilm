import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { getDefaultAdminPath, remapLegacyCounterPath } from '../../../shared/utils/adminNavigation';



export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const roles = user?.roles || [];
    const isAdminOrStaff = roles.some((r) => {
      if (!r) return false;
      const roleLower = r.toLowerCase();
      return roleLower === 'admin' || roleLower === 'staff' || roleLower.includes('admin') || roleLower.includes('staff');
    });

    let to = location.state?.from?.pathname;

    if (isAdminOrStaff) {
      if (to?.startsWith('/counter')) {
        to = remapLegacyCounterPath(to);
      }
      if (!to || (!to.startsWith('/admin') && to !== '/unauthorized')) {
        to = getDefaultAdminPath(user);
      }
    } else if (!to || to.startsWith('/admin') || to.startsWith('/counter') || to === '/unauthorized') {
      to = '/';
    }

    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
};
