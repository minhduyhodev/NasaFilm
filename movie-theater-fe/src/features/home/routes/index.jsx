import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import MoviesPage from '../pages/MoviesPage';

export const HomeRoutes = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="movies" element={<MoviesPage />} />
      <Route path="about" element={<AboutPage />} />
    </Routes>
  );
};

export default HomeRoutes;
