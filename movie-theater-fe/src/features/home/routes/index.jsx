import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute.jsx';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import HomeAnimatedLayout from '../layouts/HomeAnimatedLayout';
const OnlineMoviesPage = lazy(() => import('../pages/OnlineMoviesPage'));

const HomePage = lazy(() => import('../pages/HomePage'));
const TicketActivationPage = lazy(() => import('../pages/TicketActivationPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const MoviesPage = lazy(() => import('../pages/MoviesPage'));
const GenresBrowsePage = lazy(() => import('../pages/CatalogBrowsePage').then((m) => ({ default: m.GenresBrowsePage })));
const CountriesBrowsePage = lazy(() => import('../pages/CatalogBrowsePage').then((m) => ({ default: m.CountriesBrowsePage })));
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
const OrbitBookingPage = lazy(() => import('../pages/OrbitBookingPage'));
const OrbitWaitingPage = lazy(() => import('../pages/OrbitWaitingPage'));
const ConcessionsPage = lazy(() => import('../pages/ConcessionsPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const BookingConfirmedPage = lazy(() => import('../pages/BookingConfirmedPage'));
const PreShowBoardingPage = lazy(() => import('../pages/PreShowBoardingPage'));
const WatchPage = lazy(() => import('../pages/WatchPage'));
const RemindersPage = lazy(() => import('../pages/RemindersPage'));
const WalletPage = lazy(() => import('../pages/WalletPage'));
const SearchResultsPage = lazy(() => import('../pages/SearchResultsPage'));
const MyMoviesPage = lazy(() => import('../pages/MyMoviesPage'));
const PaymentFlow = lazy(() => import('../../payment/PaymentFlow'));
const PaymentSuccess = lazy(() => import('../../payment/PaymentSuccess'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
  </div>
);

export const HomeRoutes = () => {
  const { loading } = useAuthContext();

  if (loading) {
    return <PageLoader />;
  }

  // Admin/staff may browse the customer site (e.g. to test booking flows).
  // Login still lands them on /admin via PublicRoute / LoginPage.

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<HomeAnimatedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="online" element={<OnlineMoviesPage />} />
          <Route path="online/activate/:movieId" element={<TicketActivationPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="genres" element={<GenresBrowsePage />} />
          <Route path="countries" element={<CountriesBrowsePage />} />
          <Route path="cinemas" element={<CinemasPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="payment-policy" element={<PaymentPolicyPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="movie/:id" element={<MovieDetailPage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="my-movies" element={<MyMoviesPage />} />
          <Route
            path="booking"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="booking/orbit/:roomUuid"
            element={
              <ProtectedRoute>
                <OrbitBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="booking/orbit/:roomUuid/waiting"
            element={
              <ProtectedRoute>
                <OrbitWaitingPage />
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
            path="pre-show/boarding/:bookingUuid"
            element={
              <ProtectedRoute>
                <PreShowBoardingPage />
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
          <Route
            path="payment"
            element={
              <ProtectedRoute>
                <PaymentFlow />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment-success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default HomeRoutes;
