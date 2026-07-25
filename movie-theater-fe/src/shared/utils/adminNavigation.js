import { hasPermission, isAdmin, PERMISSIONS } from './permissions';

/** Admin / staff — không dùng khu vực khách hàng (home, đặt vé, ví…). */
export const isAdminOrStaffUser = (user) => {
  const roles = user?.roles || [];
  return roles.some((r) => {
    if (!r) return false;
    const roleLower = String(r).toLowerCase();
    return (
      roleLower === 'admin'
      || roleLower === 'staff'
      || roleLower.includes('admin')
      || roleLower.includes('staff')
    );
  });
};

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
  { path: '/admin/hr/schedule', permission: PERMISSIONS.HR_SHIFT_MANAGE },
  { path: '/admin/hr/attendance', permission: PERMISSIONS.HR_ATTENDANCE_MANAGE },
  { path: '/admin/hr/payroll', permission: PERMISSIONS.HR_PAYROLL_MANAGE },
];

export const canAccessAdminDashboard = (user) =>
  isAdmin(user) || hasPermission(user, PERMISSIONS.USER_VIEW);

export const getDefaultAdminPath = (user) => {
  if (!user) return '/login';
  if (isAdmin(user)) return '/admin';

  const match = STAFF_LANDING_CANDIDATES.find((item) =>
    hasPermission(user, item.permission),
  );
  // Mọi nhân viên đều truy cập được trang tự phục vụ "Bảng công của tôi".
  return match?.path || '/admin/hr/me';
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
