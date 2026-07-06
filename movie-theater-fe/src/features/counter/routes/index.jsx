import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CounterLayout from '../layouts/CounterLayout';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute';
import { PERMISSIONS } from '../../../shared/utils/permissions';

const CounterPOSPage = lazy(() => import('../pages/CounterPOSPage'));
const CounterCheckInPage = lazy(() => import('../pages/CounterCheckInPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center p-20 min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

export default function CounterRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<CounterLayout />}>
          <Route index element={<Navigate to="pos" replace />} />
          <Route path="pos" element={<ProtectedRoute allowedRoles={['admin', 'staff']} requiredPermissions={[PERMISSIONS.COUNTER_BOOKING_CREATE]}><CounterPOSPage /></ProtectedRoute>} />
          <Route path="check-in" element={<ProtectedRoute allowedRoles={['admin', 'staff']} requiredPermissions={[PERMISSIONS.TICKET_CHECKIN]}><CounterCheckInPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
