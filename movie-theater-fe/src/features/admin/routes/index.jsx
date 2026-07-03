import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

const CinemaRoomsNewRedirect = () => {
  const { cinemaUuid } = useParams();
  return <Navigate to={`/admin/cinemas?cinema=${cinemaUuid}`} replace />;
};

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MoviesPage = lazy(() => import("../pages/MoviesPage"));
const AdminMovieFormPage = lazy(() => import("../pages/AdminMovieFormPage"));
const AdminMovieDetailPage = lazy(
  () => import("../pages/AdminMovieDetailPage"),
);
const MediaCatalogPage = lazy(() => import("../pages/MediaCatalogPage"));
const BookingsPage = lazy(() => import("../pages/BookingsPage"));
const ShowtimesPage = lazy(() => import("../pages/ShowtimesPage"));
const CinemasPage = lazy(() => import("../pages/CinemasPage"));
const AdminCinemaDetailPage = lazy(
  () => import("../pages/AdminCinemaDetailPage"),
);
const AdminCinemaRoomFormPage = lazy(
  () => import("../pages/AdminCinemaRoomFormPage"),
);
const AdminCinemaRoomPage = lazy(() => import("../pages/AdminCinemaRoomPage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const VouchersPage = lazy(() => import("../pages/VouchersPage"));
const AdminCombosPage = lazy(() => import("../pages/AdminCombosPage"));
const AdminComboRevenuePage = lazy(() => import("../pages/AdminComboRevenuePage"));
const ConfigPage = lazy(() => import("../pages/ConfigPage"));
const EmailTemplatesPage = lazy(() => import("../pages/EmailTemplatesPage"));
const StaffPage = lazy(() => import("../pages/StaffPage"));
const StaffMissionControlPage = lazy(() => import("../pages/StaffMissionControlPage"));
const RefundsPage = lazy(() => import("../pages/RefundsPage"));
const FeedbackReviewsPage = lazy(() => import("../pages/FeedbackReviewsPage"));
const MissionsPage = lazy(() => import("../pages/MissionsPage"));
const SupportInboxPage = lazy(() => import("../pages/SupportInboxPage"));

const AdminPageLoader = () => (
  <div className="flex items-center justify-center p-20">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
  </div>
);

const PlaceholderPage = ({ title }) => (
  <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-8 text-center max-w-lg mx-auto my-12">
    <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-2 font-mono">
      {title}
    </h2>
    <p className="text-xs text-gray-400">
      Tính năng này đang được thiết lập cấu hình trong hệ thống.
    </p>
  </div>
);

export const AdminRoutes = () => {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="movies/new" element={<AdminMovieFormPage />} />
          <Route
            path="movies/:movieUuid/edit"
            element={<AdminMovieFormPage />}
          />
          <Route path="movies/:movieUuid" element={<AdminMovieDetailPage />} />
          <Route path="media" element={<MediaCatalogPage />} />
          <Route path="actors" element={<Navigate to="/admin/media" replace />} />
          <Route path="actors/new" element={<Navigate to="/admin/media" replace />} />
          <Route path="actors/:actorUuid/edit" element={<Navigate to="/admin/media" replace />} />
          <Route path="actors/:actorUuid" element={<Navigate to="/admin/media" replace />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="refunds" element={<RefundsPage />} />
          <Route path="support" element={<SupportInboxPage />} />
          <Route path="feedback-reviews" element={<FeedbackReviewsPage />} />
          <Route path="showtimes" element={<ShowtimesPage />} />
          <Route path="cinemas" element={<CinemasPage />} />
          <Route path="cinemas/new" element={<Navigate to="/admin/cinemas" replace />} />
          <Route path="cinemas/:cinemaUuid/edit" element={<Navigate to="/admin/cinemas" replace />} />
          <Route path="cinemas/:cinemaUuid/rooms/new" element={<CinemaRoomsNewRedirect />} />
          <Route
            path="cinemas/:cinemaUuid/rooms/:roomUuid/edit"
            element={<AdminCinemaRoomFormPage />}
          />
          <Route
            path="cinemas/:cinemaUuid/rooms/:roomUuid"
            element={<AdminCinemaRoomPage />}
          />
          <Route
            path="cinemas/:cinemaUuid"
            element={<AdminCinemaDetailPage />}
          />
          <Route path="users" element={<UsersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="vouchers/new" element={<Navigate to="/admin/vouchers" replace />} />
          <Route path="vouchers/:voucherId/edit" element={<Navigate to="/admin/vouchers" replace />} />
          <Route path="vouchers/:voucherId" element={<Navigate to="/admin/vouchers" replace />} />
          <Route path="combos" element={<AdminCombosPage />} />
          <Route path="combos/revenue" element={<AdminComboRevenuePage />} />
          <Route path="combos/new" element={<Navigate to="/admin/combos" replace />} />
          <Route path="combos/:comboUuid/edit" element={<Navigate to="/admin/combos" replace />} />
          <Route path="combos/:comboUuid" element={<Navigate to="/admin/combos" replace />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="staff-control" element={<StaffMissionControlPage />} />
          <Route path="staff_control" element={<Navigate to="/admin/staff-control" replace />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="email-templates" element={<EmailTemplatesPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
