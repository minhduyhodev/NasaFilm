export const REALTIME_TOPICS = {
  ADMIN_DASHBOARD: '/topic/admin/dashboard',
  ADMIN_BOOKINGS: '/topic/admin/bookings',
  ADMIN_REVIEW_REPORTS: '/topic/admin/review-reports',
  STAFF_CHECK_IN: '/topic/staff/check-in',
  showtimeSeats: (showtimeUuid) => `/topic/showtimes/${showtimeUuid}/seats`,
};
