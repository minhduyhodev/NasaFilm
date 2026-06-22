export const formatDateForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const formatDateForBackend = (localString) => {
  if (!localString) return null;
  const date = new Date(localString);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (value) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offsetHours}:${offsetMins}`;
};

export const parsePromotionDate = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const getVoucherLifecycleStatus = (voucher) => {
  const now = Date.now();
  const start = parsePromotionDate(voucher?.startDate);
  const end = parsePromotionDate(voucher?.endDate);
  const used = voucher?.usedCount ?? 0;
  const max = voucher?.maxUsage;

  if (voucher?.deletedAt || voucher?.status === 'DELETED') {
    return { code: 'DELETED', label: 'Đã xóa', tone: 'zinc' };
  }
  if (voucher?.status !== 'ACTIVE') {
    return { code: 'INACTIVE', label: 'Vô hiệu', tone: 'amber' };
  }
  if (end != null && end < now) {
    return { code: 'EXPIRED', label: 'Hết hạn', tone: 'rose' };
  }
  if (start != null && start > now) {
    return { code: 'SCHEDULED', label: 'Chưa hiệu lực', tone: 'zinc' };
  }
  if (max != null && max > 0 && used >= max) {
    return { code: 'EXHAUSTED', label: 'Hết lượt', tone: 'rose' };
  }
  if (end != null && end - now < 7 * 24 * 60 * 60 * 1000) {
    return { code: 'ACTIVE', label: 'Hoạt động', tone: 'emerald', soonExpiring: true };
  }
  return { code: 'ACTIVE', label: 'Hoạt động', tone: 'emerald' };
};

export const validateVoucherSchedule = ({ startDate, endDate, isEditing = false }) => {
  if (!startDate || !endDate) {
    return 'Vui lòng nhập ngày bắt đầu và ngày kết thúc';
  }
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Ngày hiệu lực không hợp lệ';
  }
  if (start >= end) {
    return 'Ngày bắt đầu phải trước ngày kết thúc';
  }
  if (!isEditing && end <= now) {
    return 'Ngày kết thúc phải sau thời điểm hiện tại';
  }
  return null;
};

const VOUCHER_STATUS_TONE_CLASS = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  zinc: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400',
};

export const getVoucherStatusClassName = (tone) => VOUCHER_STATUS_TONE_CLASS[tone] || VOUCHER_STATUS_TONE_CLASS.zinc;

export const formatDateTimeDisplay = (localString) => {
  if (!localString) return 'Chua thiet lap';
  const parts = localString.split('T');
  if (parts.length === 2) {
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
      return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
    }
  }
  return localString;
};

export const formatDiscountDisplay = (voucher) => {
  if (!voucher) return '—';
  if (voucher.discountType === 'PERCENTAGE') {
    return `${Math.round(voucher.discountValue * 100)}%`;
  }
  return `${Number(voucher.discountValue).toLocaleString('vi-VN')} VND`;
};

export const validateVoucherDiscountValue = (discountType, discountValue, pointsToCashValue) => {
  const valueNum = parseFloat(discountValue);
  if (Number.isNaN(valueNum) || valueNum <= 0) {
    return 'Giá trị giảm phải lớn hơn 0';
  }
  if (discountType === 'PERCENTAGE') {
    if (valueNum > 100) return 'Phần trăm tối đa 100%';
    return null;
  }
  const minAmount = Number(pointsToCashValue) || 1000;
  if (valueNum < minAmount) {
    return `Giá trị giảm cố định phải tối thiểu ${minAmount.toLocaleString('vi-VN')} VND (bằng giá trị 1 điểm trong cấu hình hệ thống)`;
  }
  return null;
};
