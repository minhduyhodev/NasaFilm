/** Khớp BookingService.confirmBooking — giảm combo theo điểm thành viên */
export const MEMBER_VIP_SCORE = 10000;
export const MEMBER_FRIEND_SCORE = 5000;

export const getMemberDiscountRate = (score = 0) => {
  if (score >= MEMBER_VIP_SCORE) return 0.15;
  if (score >= MEMBER_FRIEND_SCORE) return 0.1;
  return 0;
};

export const getMemberTierLabel = (score = 0) => {
  if (score >= MEMBER_VIP_SCORE) return "NASA'VIP";
  if (score >= MEMBER_FRIEND_SCORE) return "NASA'FRIEND";
  return 'Thành viên';
};
