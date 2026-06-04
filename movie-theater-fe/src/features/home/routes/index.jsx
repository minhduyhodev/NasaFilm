import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';

export const HomeRoutes = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="about" element={<AboutPage />} />
    </Routes>
  );
};

export default HomeRoutes;
