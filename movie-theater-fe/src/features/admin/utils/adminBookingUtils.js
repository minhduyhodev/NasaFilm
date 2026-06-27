const CLOSED_STATUSES = new Set([
  'CANCELLED',
  'REFUNDED',
  'REFUND_PROCESSING',
  'CANCELLING',
]);

/** Đơn đã đóng (hủy/hoàn tiền) hoặc suất chiếu đã qua. */
export const isAdminBookingArchived = (booking, getShowtime) => {
  const status = (booking?.status || '').toUpperCase();
  if (CLOSED_STATUSES.has(status)) return true;
  if (status === 'REFUND_PENDING') return false;

  if (status === 'CONFIRMED') {
    const st = getShowtime?.(booking);
    if (st?.startTime) {
      const showtimeEnd = new Date(st.startTime);
      showtimeEnd.setHours(showtimeEnd.getHours() + 3);
      return Date.now() > showtimeEnd.getTime();
    }
  }

  return false;
};

export const partitionAdminBookings = (bookings = [], getShowtime) => {
  const active = [];
  const archived = [];
  bookings.forEach((booking) => {
    if (isAdminBookingArchived(booking, getShowtime)) archived.push(booking);
    else active.push(booking);
  });
  return { active, archived };
};

export const getAdminBookingArchiveLabel = (booking, getShowtime) => {
  const status = (booking?.status || '').toUpperCase();
  if (status === 'CANCELLED') return 'Đã hủy';
  if (status === 'REFUNDED') return 'Đã hoàn tiền';
  if (status === 'REFUND_PROCESSING') return 'Đang hoàn tiền';
  if (status === 'CONFIRMED') {
    const st = getShowtime?.(booking);
    if (st?.startTime && Date.now() > new Date(st.startTime).getTime()) {
      return 'Đã qua suất chiếu';
    }
  }
  return 'Đã đóng';
};
