import React from 'react';
import { Outlet } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GuestAuthPromoBar, useGuestPromoVisible } from '../components/GuestAuthPromo';
import { HomeChromeProvider, useHomeChrome } from '../context/HomeChromeContext';
import { useMovieReminderScheduler } from '../hooks/useMovieReminderScheduler';
import '../components/GuestAuthPromo.css';

const HomeLayoutShell = () => {
  useMovieReminderScheduler();
  const { hideChrome } = useHomeChrome();
  const guestPromoVisible = useGuestPromoVisible();
  const showGuestPromoBar = !hideChrome && guestPromoVisible;

  return (
    <div className={`text-white min-h-screen flex flex-col${showGuestPromoBar ? ' guest-layout--guest-promo' : ''}`}>
      {!hideChrome && <Navbar />}
      <PageTransition className="flex-1">
        <Outlet />
      </PageTransition>
      {!hideChrome && <Footer />}
      {showGuestPromoBar && <GuestAuthPromoBar />}
    </div>
  );
};

const HomeAnimatedLayout = () => (
  <HomeChromeProvider>
    <HomeLayoutShell />
  </HomeChromeProvider>
);

export default HomeAnimatedLayout;
