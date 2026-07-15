export function formatMoney(amount) {
  if (amount == null || amount === '') return '—';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
}

export function formatMinutes(minutes) {
  const value = Number(minutes) || 0;
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}p`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function formatHours(minutes) {
  const value = Number(minutes) || 0;
  return (value / 60).toFixed(2);
}

/** Múi giờ nghiệp vụ (đồng bộ với backend AppTimeZones.BUSINESS). VN không có DST nên offset cố định +07:00. */
export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: VN_TIME_ZONE,
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VN_TIME_ZONE,
  });
}

export function formatTime(value) {
  if (!value) return '—';
  // LocalTime "HH:mm:ss" hoặc "HH:mm"
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: VN_TIME_ZONE });
}

export function formatClock(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: VN_TIME_ZONE });
}

/**
 * Dựng mốc thời gian tuyệt đối cho một ngày+giờ theo múi giờ VN (+07:00),
 * để so sánh không lệch theo múi giờ máy người dùng.
 */
export function vnDateTime(isoDate, time) {
  if (!isoDate || !time) return null;
  const t = String(time);
  const hhmmss = /^\d{2}:\d{2}:\d{2}/.test(t) ? t.slice(0, 8) : `${t.slice(0, 5)}:00`;
  const d = new Date(`${isoDate}T${hhmmss}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Chuyển Date -> chuỗi yyyy-MM-dd theo local (không lệch múi giờ). */
export function toIsoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function startOfWeekIso(reference = new Date()) {
  const d = reference instanceof Date ? new Date(reference) : new Date(reference);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toIsoDate(d);
}

export function monthRangeIso(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

/** Khớp với backend: cho check-in từ 60' trước giờ vào ca đến 30' sau giờ tan ca. */
export const CHECK_IN_EARLY_MINUTES = 60;
export const CHECK_IN_LATE_MINUTES = 30;

/**
 * Xác định trạng thái cửa sổ check-in cho một ca:
 * 'UPCOMING' (chưa tới giờ), 'OPEN' (đang trong cửa sổ), 'MISSED' (đã quá giờ / ngày đã qua).
 */
export function shiftCheckInState(workDate, startTime, endTime, now = new Date()) {
  if (!workDate || !startTime || !endTime) return 'UPCOMING';
  const start = vnDateTime(workDate, startTime);
  let end = vnDateTime(workDate, endTime);
  if (!start || !end) return 'UPCOMING';
  // Ca qua đêm: giờ tan <= giờ vào -> giờ tan thuộc ngày hôm sau.
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60000);
  }
  const openFrom = new Date(start.getTime() - CHECK_IN_EARLY_MINUTES * 60000);
  const openUntil = new Date(end.getTime() + CHECK_IN_LATE_MINUTES * 60000);
  if (now.getTime() < openFrom.getTime()) return 'UPCOMING';
  if (now.getTime() > openUntil.getTime()) return 'MISSED';
  return 'OPEN';
}

/** Nhãn thứ trong tuần (tiếng Việt) cho một ngày ISO yyyy-MM-dd. */
export function weekdayLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
}

/**
 * Gom trạng thái của một ca thành nhóm để tổng hợp/hiển thị:
 * 'open' (đang mở check-in), 'inProgress' (đã vào, chưa ra), 'done' (đã hoàn tất),
 * 'upcoming' (chưa tới giờ), 'missed' (đã lỡ / vắng), 'cancelled' (đã hủy).
 */
export function categorizeShift(shift, now = new Date()) {
  if (!shift) return 'upcoming';
  if (shift.status === 'CANCELLED') return 'cancelled';
  if (shift.checkOutAt) return 'done';
  if (shift.checkInAt) return 'inProgress';
  if (shift.attendanceStatus === 'ABSENT') return 'missed';
  const windowState = shiftCheckInState(shift.workDate, shift.startTime, shift.endTime, now);
  if (windowState === 'OPEN') return 'open';
  if (windowState === 'MISSED') return 'missed';
  return 'upcoming';
}

export const SHIFT_CATEGORY_META = {
  open: { label: 'Chờ vào ca', color: '#fbbf24' },
  inProgress: { label: 'Đang làm', color: '#38bdf8' },
  done: { label: 'Hoàn tất', color: '#34d399' },
  upcoming: { label: 'Sắp tới', color: '#94a3b8' },
  missed: { label: 'Đã lỡ', color: '#f87171' },
  cancelled: { label: 'Đã hủy', color: '#64748b' },
};

/** Thứ tự ưu tiên hiển thị các nhóm trạng thái trong phần tóm tắt. */
export const SHIFT_CATEGORY_ORDER = ['open', 'inProgress', 'done', 'upcoming', 'missed', 'cancelled'];

export const ATTENDANCE_STATUS_META = {
  IN_PROGRESS: { label: 'Đang làm', className: 'hr-badge hr-badge--info' },
  ON_TIME: { label: 'Đúng giờ', className: 'hr-badge hr-badge--success' },
  LATE: { label: 'Đi muộn', className: 'hr-badge hr-badge--warning' },
  EARLY_LEAVE: { label: 'Về sớm', className: 'hr-badge hr-badge--warning' },
  ABSENT: { label: 'Vắng', className: 'hr-badge hr-badge--danger' },
};

export const APPROVAL_STATUS_META = {
  PENDING: { label: 'Chờ duyệt', className: 'hr-badge hr-badge--warning' },
  APPROVED: { label: 'Đã duyệt', className: 'hr-badge hr-badge--success' },
  REJECTED: { label: 'Từ chối', className: 'hr-badge hr-badge--danger' },
};

export const PAYROLL_STATUS_META = {
  OPEN: { label: 'Đang mở', className: 'hr-badge hr-badge--info' },
  GENERATED: { label: 'Đã sinh phiếu', className: 'hr-badge hr-badge--warning' },
  APPROVED: { label: 'Đã duyệt', className: 'hr-badge hr-badge--success' },
  PAID: { label: 'Đã chi trả', className: 'hr-badge hr-badge--paid' },
};

export const PAYSLIP_STATUS_META = {
  DRAFT: { label: 'Nháp', className: 'hr-badge hr-badge--info' },
  APPROVED: { label: 'Đã duyệt', className: 'hr-badge hr-badge--success' },
  PAID: { label: 'Đã chi trả', className: 'hr-badge hr-badge--paid' },
};

export const REQUEST_STATUS_META = {
  PENDING: { label: 'Chờ duyệt', className: 'hr-badge hr-badge--warning' },
  APPROVED: { label: 'Đã duyệt', className: 'hr-badge hr-badge--success' },
  REJECTED: { label: 'Từ chối', className: 'hr-badge hr-badge--danger' },
  CANCELLED: { label: 'Đã hủy', className: 'hr-badge' },
};

export const LEAVE_TYPE_META = {
  ANNUAL: { label: 'Phép năm' },
  UNPAID: { label: 'Không lương' },
  SICK: { label: 'Nghỉ ốm' },
  OTHER: { label: 'Khác' },
};

export function leaveTypeLabel(value) {
  return LEAVE_TYPE_META[value]?.label || value || '—';
}

export function statusBadge(meta, value) {
  const found = meta[value];
  return found || { label: value || '—', className: 'hr-badge' };
}
