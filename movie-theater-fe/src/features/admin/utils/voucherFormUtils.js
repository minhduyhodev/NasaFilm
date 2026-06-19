export const formatDateForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const formatDateForBackend = (localString) => {
  if (!localString) return null;
  return new Date(localString).toISOString();
};

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
