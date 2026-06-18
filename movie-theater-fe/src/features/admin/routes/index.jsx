import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const MoviesPage = lazy(() => import('../pages/MoviesPage'));
const ActorsPage = lazy(() => import('../pages/ActorsPage'));
const BookingsPage = lazy(() => import('../pages/BookingsPage'));
const ShowtimesPage = lazy(() => import('../pages/ShowtimesPage'));
const CinemasPage = lazy(() => import('../pages/CinemasPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const VouchersPage = lazy(() => import('../pages/VouchersPage'));
const AdminCombosPage = lazy(() => import('../pages/AdminCombosPage'));

const AdminPageLoader = () => (
  <div className="flex items-center justify-center p-20">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
  </div>
);

export const AdminRoutes = () => {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Routes>
        <Route path="cinemas" element={<CinemasPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="actors" element={<ActorsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="showtimes" element={<ShowtimesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="combos" element={<AdminCombosPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
