export const REALTIME_TOPICS = {
  ADMIN_DASHBOARD: '/topic/admin/dashboard',
  ADMIN_BOOKINGS: '/topic/admin/bookings',
  ADMIN_REVIEW_REPORTS: '/topic/admin/review-reports',
  ADMIN_SUPPORT: '/topic/admin/support',
  STAFF_CHECK_IN: '/topic/staff/check-in',
  supportTicket: (ticketCode) => `/topic/support/${ticketCode}`,
  showtimeSeats: (showtimeUuid) => `/topic/showtimes/${showtimeUuid}/seats`,
};
