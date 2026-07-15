const CLOSED_STATUSES = new Set([
  'CANCELLED',
  'REFUNDED',
  'REFUND_PROCESSING',
  'CANCELLING',
]);

/**
 * Đơn đã đóng (hủy/hoàn tiền) hoặc đã qua suất chiếu / đã soát vé.
 * `activityStatus` do server suy ra theo thời gian suất chiếu (end_time) và trạng thái soát vé,
 * nên không còn phải đoán suất chiếu ở client.
 */
export const isAdminBookingArchived = (booking) => {
  const status = (booking?.status || '').toUpperCase();
  if (CLOSED_STATUSES.has(status)) return true;
  if (status === 'REFUND_PENDING') return false;

  const activity = (booking?.activityStatus || '').toLowerCase();
  return activity === 'expired' || activity === 'used';
};

export const partitionAdminBookings = (bookings = []) => {
  const active = [];
  const archived = [];
  bookings.forEach((booking) => {
    if (isAdminBookingArchived(booking)) archived.push(booking);
    else active.push(booking);
  });
  return { active, archived };
};

export const getAdminBookingArchiveLabel = (booking) => {
  const status = (booking?.status || '').toUpperCase();
  if (status === 'CANCELLED') return 'Đã hủy';
  if (status === 'REFUNDED') return 'Đã hoàn tiền';
  if (status === 'REFUND_PROCESSING') return 'Đang hoàn tiền';

  const activity = (booking?.activityStatus || '').toLowerCase();
  if (activity === 'used') return 'Đã sử dụng';
  if (activity === 'expired') return 'Đã qua suất chiếu';
  return 'Đã đóng';
};
