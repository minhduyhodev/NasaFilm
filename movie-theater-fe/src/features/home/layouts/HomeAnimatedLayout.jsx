import React from 'react';
import { Outlet } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import { useMovieReminderScheduler } from '../hooks/useMovieReminderScheduler';

const HomeAnimatedLayout = () => {
  useMovieReminderScheduler();

  return (
    <PageTransition>
      <Outlet />
    </PageTransition>
  );
};

export default HomeAnimatedLayout;
