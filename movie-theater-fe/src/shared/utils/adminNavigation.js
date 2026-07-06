import { hasPermission, isAdmin, PERMISSIONS } from './permissions';

/** Thứ tự ưu tiên trang mặc định sau đăng nhập (staff không phải admin). */
const STAFF_LANDING_CANDIDATES = [
  { path: '/admin', permission: PERMISSIONS.USER_VIEW },
  { path: '/admin/pos', permission: PERMISSIONS.COUNTER_BOOKING_CREATE },
  { path: '/admin/staff-control', permission: PERMISSIONS.TICKET_CHECKIN },
  { path: '/admin/bookings', permission: PERMISSIONS.USER_VIEW },
  { path: '/admin/refunds', permission: PERMISSIONS.COUNTER_REFUND_PROCESS },
  { path: '/admin/showtimes', permission: PERMISSIONS.SHOWTIME_WRITE },
  { path: '/admin/combos', permission: PERMISSIONS.COMBO_WRITE },
  { path: '/admin/support', permission: PERMISSIONS.SUPPORT_MANAGE },
];

export const canAccessAdminDashboard = (user) =>
  isAdmin(user) || hasPermission(user, PERMISSIONS.USER_VIEW);

export const getDefaultAdminPath = (user) => {
  if (!user) return '/login';
  if (isAdmin(user)) return '/admin';

  const match = STAFF_LANDING_CANDIDATES.find((item) =>
    hasPermission(user, item.permission),
  );
  return match?.path || '/unauthorized';
};

/** Chuyển URL counter cũ sang admin thống nhất. */
export const remapLegacyCounterPath = (pathname = '') => {
  if (!pathname.startsWith('/counter')) return pathname;
  if (pathname.startsWith('/counter/check-in')) return '/admin/staff-control';
  if (pathname.startsWith('/counter/pos')) return '/admin/pos';
  return '/admin/pos';
};

export const isCounterOpsPath = (pathname = '') =>
  pathname.startsWith('/admin/pos') || pathname.startsWith('/admin/staff-control');

export const OPERATIONS_PERMISSIONS = [
  PERMISSIONS.COUNTER_BOOKING_CREATE,
  PERMISSIONS.TICKET_CHECKIN,
];
