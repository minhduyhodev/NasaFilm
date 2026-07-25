export const PERMISSIONS = {
  TICKET_CHECKIN: 'TICKET_CHECKIN',
  COUNTER_BOOKING_CREATE: 'COUNTER_BOOKING_CREATE',
  COUNTER_COMBO_CREATE: 'COUNTER_COMBO_CREATE',
  COUNTER_VOUCHER_APPLY: 'COUNTER_VOUCHER_APPLY',
  COUNTER_REFUND_PROCESS: 'COUNTER_REFUND_PROCESS',
  COUNTER_CUSTOMER_CREATE: 'COUNTER_CUSTOMER_CREATE',
  MOVIE_WRITE: 'MOVIE_WRITE',
  SHOWTIME_WRITE: 'SHOWTIME_WRITE',
  COMBO_WRITE: 'COMBO_WRITE',
  PROMOTION_WRITE: 'PROMOTION_WRITE',
  USER_VIEW: 'USER_VIEW',
  SUPPORT_MANAGE: 'SUPPORT_MANAGE',
  HR_SHIFT_MANAGE: 'HR_SHIFT_MANAGE',
  HR_ATTENDANCE_MANAGE: 'HR_ATTENDANCE_MANAGE',
  HR_PAYROLL_MANAGE: 'HR_PAYROLL_MANAGE',
};

export const isAdmin = (user) => (user?.roles || []).includes('admin');

export const hasPermission = (user, permission) => {
  if (!permission) return true;
  if (isAdmin(user)) return true;
  return (user?.permissions || []).includes(permission);
};

export const hasAnyPermission = (user, permissions = []) => {
  if (isAdmin(user)) return true;
  if (!permissions.length) return true;
  return permissions.some((permission) => hasPermission(user, permission));
};
