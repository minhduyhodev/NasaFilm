export const REALTIME_TOPICS = {
  ADMIN_DASHBOARD: '/topic/admin/dashboard',
  ADMIN_BOOKINGS: '/topic/admin/bookings',
  ADMIN_REVIEW_REPORTS: '/topic/admin/review-reports',
  ADMIN_SUPPORT: '/topic/admin/support',
  ADMIN_SUPPORT_LIVE: '/topic/admin/support-live',
  SUPPORT_AGENTS: '/topic/staff/support-agents',
  STAFF_CHECK_IN: '/topic/staff/check-in',
  supportTicket: (ticketCode) => `/topic/support/${ticketCode}`,
  showtimeSeats: (showtimeUuid) => `/topic/showtimes/${showtimeUuid}/seats`,
  orbitRoom: (roomUuid) => `/topic/orbit/${roomUuid}`,
  orbitRoomChat: (roomUuid) => `/topic/orbit/${roomUuid}/chat`,
};
