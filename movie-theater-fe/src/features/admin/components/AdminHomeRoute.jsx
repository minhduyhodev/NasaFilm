import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { canAccessAdminDashboard, getDefaultAdminPath } from '../../../shared/utils/adminNavigation';

const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));

const AdminHomeRoute = () => {
  const { user } = useAuthContext();

  if (!canAccessAdminDashboard(user)) {
    return <Navigate to={getDefaultAdminPath(user)} replace />;
  }

  return (
    <React.Suspense fallback={null}>
      <DashboardPage />
    </React.Suspense>
  );
};

export default AdminHomeRoute;
