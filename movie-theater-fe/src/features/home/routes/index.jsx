import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute.jsx';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import HomeAnimatedLayout from '../layouts/HomeAnimatedLayout';
import OnlineMoviesPage from '../pages/OnlineMoviesPage';
import { prefetchOnlinePage } from '../utils/onlineMoviesCache';

const HomePage = lazy(() => import('../pages/HomePage'));
const TicketActivationPage = lazy(() => import('../pages/TicketActivationPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const MoviesPage = lazy(() => import('../pages/MoviesPage'));
const CinemasPage = lazy(() => import('../pages/CinemasPage'));
const OffersPage = lazy(() => import('../pages/OffersPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const TermsPage = lazy(() => import('../pages/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const PaymentPolicyPage = lazy(() => import('../pages/PaymentPolicyPage'));
const RefundPolicyPage = lazy(() => import('../pages/RefundPolicyPage'));
const FaqPage = lazy(() => import('../pages/FaqPage'));
const MovieDetailPage = lazy(() => import('../pages/MovieDetailPage'));
const BookingPage = lazy(() => import('../pages/BookingPage'));
const ConcessionsPage = lazy(() => import('../pages/ConcessionsPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const BookingConfirmedPage = lazy(() => import('../pages/BookingConfirmedPage'));
const WatchPage = lazy(() => import('../pages/WatchPage'));
const RemindersPage = lazy(() => import('../pages/RemindersPage'));
const WalletPage = lazy(() => import('../pages/WalletPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
  </div>
);

export const HomeRoutes = () => {
  const { isAuthenticated, loading, user } = useAuthContext();

  useEffect(() => {
    if (!loading) prefetchOnlinePage();
  }, [loading]);

  if (loading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    const roles = user?.roles || [];
    const isAdminOrStaff = roles.some((r) => {
      if (!r) return false;
      const roleLower = r.toLowerCase();
      return roleLower === 'admin' || roleLower === 'staff' || roleLower.includes('admin') || roleLower.includes('staff');
    });

    if (isAdminOrStaff) {
      return <Navigate to="/admin" replace />;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<HomeAnimatedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="online" element={<OnlineMoviesPage />} />
          <Route path="online/activate/:movieId" element={<TicketActivationPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="cinemas" element={<CinemasPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="payment-policy" element={<PaymentPolicyPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="movie/:id" element={<MovieDetailPage />} />
          <Route
            path="booking"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="concessions"
            element={
              <ProtectedRoute>
                <ConcessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="booking-confirmed"
            element={
              <ProtectedRoute>
                <BookingConfirmedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reminders"
            element={
              <ProtectedRoute>
                <RemindersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="wallet"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="watch/:id"
            element={
              <ProtectedRoute>
                <WatchPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default HomeRoutes;
