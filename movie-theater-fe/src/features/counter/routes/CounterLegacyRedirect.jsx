import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { getDefaultAdminPath, remapLegacyCounterPath } from '../../../shared/utils/adminNavigation';

const CounterLegacyRedirect = () => {
  const location = useLocation();
  const { user } = useAuthContext();
  const target = remapLegacyCounterPath(location.pathname) || getDefaultAdminPath(user);
  return <Navigate to={target} replace />;
};

export default CounterLegacyRedirect;
