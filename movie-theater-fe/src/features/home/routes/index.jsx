import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import MoviesPage from '../pages/MoviesPage';
import CinemasPage from '../pages/CinemasPage';
import OffersPage from '../pages/OffersPage';

export const HomeRoutes = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="movies" element={<MoviesPage />} />
      <Route path="cinemas" element={<CinemasPage />} />
      <Route path="offers" element={<OffersPage />} />
      <Route path="about" element={<AboutPage />} />
    </Routes>
  );
};

export default HomeRoutes;
