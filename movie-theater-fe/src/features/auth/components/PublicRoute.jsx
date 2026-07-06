import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';



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

    const permissions = user?.permissions || [];
    const isCounterOnly = permissions.some(p => p.startsWith('COUNTER_') || p === 'TICKET_CHECKIN') && 
                          !permissions.some(p => p.endsWith('_WRITE') || p === 'USER_VIEW' || p === 'SUPPORT_MANAGE');

    let to = (location.state)?.from?.pathname;
    
    if (isAdminOrStaff) {
      if (isCounterOnly) {
        to = (!to || !to.startsWith('/counter')) ? '/counter/pos' : to;
      } else {
        if (!to || (!to.startsWith('/admin') && !to.startsWith('/counter'))) {
          to = '/admin';
        }
      }
    } else {
      if (!to || to.startsWith('/admin') || to.startsWith('/counter') || to === '/unauthorized') {
        to = '/';
      }
    }

    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
};
