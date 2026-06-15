import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute.jsx';
import { useAuthContext } from '../../auth/hooks/useAuthContext';

const HomePage = lazy(() => import('../pages/HomePage'));
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
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const BookingConfirmedPage = lazy(() => import('../pages/BookingConfirmedPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#090b11] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
  </div>
);

export const HomeRoutes = () => {
  const { isAuthenticated, loading, user } = useAuthContext();

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
        <Route index element={<HomePage />} />
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
      </Routes>
    </Suspense>
  );
};

export default HomeRoutes;
