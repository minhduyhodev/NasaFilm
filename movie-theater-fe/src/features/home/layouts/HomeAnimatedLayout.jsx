import React from 'react';
import { Outlet } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';

const HomeAnimatedLayout = () => (
  <PageTransition>
    <Outlet />
  </PageTransition>
);

export default HomeAnimatedLayout;
