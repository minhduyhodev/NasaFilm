export const MISSION_RECURRENCE_LABELS = {
  ONCE: 'Một lần',
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
};

/** Tên tiếng Việt khi backend còn lưu tên tiếng Anh cũ */
export const MISSION_TITLE_VI = {
  EXPLORER: 'Khám phá phim',
  PREMIERE: 'Suất chiếu đầu',
  HYBRID_PILOT: 'Xem rạp + online',
  SOCIAL_ORBIT: 'Đặt vé nhóm',
  REVIEWER: 'Nhà phê bình',
};

export const getMissionTitleVi = (mission) =>
  MISSION_TITLE_VI[mission?.code] || mission?.title || 'Nhiệm vụ';

export const MISSION_TIER_LABEL_VI = {
  'NASA Member': 'Thành viên NASA',
};

export const MISSION_ACTION_HINTS = {
  EXPLORER: 'Đặt vé rạp hoặc phát VOD lần đầu để khám phá thể loại mới.',
  PREMIERE: 'Chọn phim vừa khởi chiếu và đặt vé trong 3 ngày đầu.',
  HYBRID_PILOT: 'Xem cùng một phim ở rạp và mua thêm bản VOD.',
  SOCIAL_ORBIT: 'Tham gia phòng Orbit Seat khi tính năng ra mắt.',
  REVIEWER: 'Viết đánh giá có gắn vibe tag trên trang chi tiết phim.',
};

export const formatCycleLabel = (mission) => {
  if (!mission?.recurrence || mission.recurrence === 'ONCE') {
    return null;
  }
  if (mission.recurrence === 'WEEKLY' && mission.cycleKey) {
    return `Chu kỳ tuần ${mission.cycleKey.replace(/^.*W/, '')}`;
  }
  if (mission.recurrence === 'MONTHLY' && mission.cycleKey) {
    const [year, month] = mission.cycleKey.split('-');
    return `Chu kỳ tháng ${month}/${year}`;
  }
  return MISSION_RECURRENCE_LABELS[mission.recurrence] || mission.cycleKey;
};

export const formatTierGap = (lifetimeScore = 0, nextTierAt = 5000) => {
  const gap = Math.max(nextTierAt - lifetimeScore, 0);
  if (gap <= 0) {
    return 'Bạn đã đạt mốc hạng hiện tại.';
  }
  return `Còn ${gap.toLocaleString('vi-VN')} điểm để lên hạng tiếp theo.`;
};
