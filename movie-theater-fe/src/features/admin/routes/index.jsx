import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MoviesPage = lazy(() => import("../pages/MoviesPage"));
const AdminMovieFormPage = lazy(() => import("../pages/AdminMovieFormPage"));
const AdminMovieDetailPage = lazy(() => import("../pages/AdminMovieDetailPage"));
const ActorsPage = lazy(() => import("../pages/ActorsPage"));
const AdminActorFormPage = lazy(() => import("../pages/AdminActorFormPage"));
const AdminActorDetailPage = lazy(() => import("../pages/AdminActorDetailPage"));
const BookingsPage = lazy(() => import("../pages/BookingsPage"));
const ShowtimesPage = lazy(() => import("../pages/ShowtimesPage"));
const CinemasPage = lazy(() => import("../pages/CinemasPage"));
const AdminCinemaFormPage = lazy(() => import("../pages/AdminCinemaFormPage"));
const AdminCinemaDetailPage = lazy(() => import("../pages/AdminCinemaDetailPage"));
const AdminCinemaRoomFormPage = lazy(() => import("../pages/AdminCinemaRoomFormPage"));
const AdminCinemaRoomPage = lazy(() => import("../pages/AdminCinemaRoomPage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const VouchersPage = lazy(() => import("../pages/VouchersPage"));
const AdminVoucherFormPage = lazy(() => import("../pages/AdminVoucherFormPage"));
const AdminVoucherDetailPage = lazy(() => import("../pages/AdminVoucherDetailPage"));
const AdminCombosPage = lazy(() => import("../pages/AdminCombosPage"));
const AdminComboFormPage = lazy(() => import("../pages/AdminComboFormPage"));
const AdminComboDetailPage = lazy(() => import("../pages/AdminComboDetailPage"));
const ConfigPage = lazy(() => import("../pages/ConfigPage"));
const EmailTemplatesPage = lazy(() => import("../pages/EmailTemplatesPage"));
const StaffPage = lazy(() => import("../pages/StaffPage"));

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
          <Route path="movies/:movieUuid/edit" element={<AdminMovieFormPage />} />
          <Route path="movies/:movieUuid" element={<AdminMovieDetailPage />} />
          <Route path="actors" element={<ActorsPage />} />
          <Route path="actors/new" element={<AdminActorFormPage />} />
          <Route path="actors/:actorUuid/edit" element={<AdminActorFormPage />} />
          <Route path="actors/:actorUuid" element={<AdminActorDetailPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="showtimes" element={<ShowtimesPage />} />
          <Route path="cinemas" element={<CinemasPage />} />
          <Route path="cinemas/new" element={<AdminCinemaFormPage />} />
          <Route path="cinemas/:cinemaUuid/edit" element={<AdminCinemaFormPage />} />
          <Route path="cinemas/:cinemaUuid/rooms/new" element={<AdminCinemaRoomFormPage />} />
          <Route path="cinemas/:cinemaUuid/rooms/:roomUuid/edit" element={<AdminCinemaRoomFormPage />} />
          <Route path="cinemas/:cinemaUuid/rooms/:roomUuid" element={<AdminCinemaRoomPage />} />
          <Route path="cinemas/:cinemaUuid" element={<AdminCinemaDetailPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="vouchers/new" element={<AdminVoucherFormPage />} />
          <Route path="vouchers/:voucherId/edit" element={<AdminVoucherFormPage />} />
          <Route path="vouchers/:voucherId" element={<AdminVoucherDetailPage />} />
          <Route path="combos" element={<AdminCombosPage />} />
          <Route path="combos/new" element={<AdminComboFormPage />} />
          <Route path="combos/:comboUuid/edit" element={<AdminComboFormPage />} />
          <Route path="combos/:comboUuid" element={<AdminComboDetailPage />} />
          <Route
            path="combos/revenue"
            element={<PlaceholderPage title="Báo Cáo Doanh Thu Bắp Nước" />}
          />
          <Route path="staff" element={<StaffPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="email-templates" element={<EmailTemplatesPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
