import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import DashboardPage from '../pages/DashboardPage';
import MoviesPage from '../pages/MoviesPage';
import ShowtimesPage from '../pages/ShowtimesPage';
import CinemasPage from '../pages/CinemasPage';
import UsersPage from '../pages/UsersPage';
import SalesPage from '../pages/SalesPage';

export const AdminRoutes = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="movies" element={<MoviesPage />} />
        <Route path="showtimes" element={<ShowtimesPage />} />
        <Route path="cinemas" element={<CinemasPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="sales" element={<SalesPage />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
