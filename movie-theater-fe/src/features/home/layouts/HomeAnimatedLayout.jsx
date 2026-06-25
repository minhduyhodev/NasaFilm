import React from 'react';
import { Outlet } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { HomeChromeProvider, useHomeChrome } from '../context/HomeChromeContext';
import { useMovieReminderScheduler } from '../hooks/useMovieReminderScheduler';

const HomeLayoutShell = () => {
  useMovieReminderScheduler();
  const { hideChrome } = useHomeChrome();

  return (
    <div className="text-white min-h-screen flex flex-col">
      {!hideChrome && <Navbar />}
      <PageTransition className="flex-1">
        <Outlet />
      </PageTransition>
      {!hideChrome && <Footer />}
    </div>
  );
};

const HomeAnimatedLayout = () => (
  <HomeChromeProvider>
    <HomeLayoutShell />
  </HomeChromeProvider>
);

export default HomeAnimatedLayout;
