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
  MATCHMAKER_EXPLORER: 'Nhà thám hiểm',
};

export const getMissionTitleVi = (mission) =>
  MISSION_TITLE_VI[mission?.code] || mission?.title || 'Nhiệm vụ';

export const MISSION_TIER_LABEL_VI = {
  'NASA Member': 'Thành viên NASA',
  "NASA'FRIEND": 'NASA Friend',
  'NASA Friend': 'NASA Friend',
  "NASA'VIP": 'NASA VIP',
  'NASA VIP': 'NASA VIP',
};

export const MISSION_ACTION_HINTS = {
  EXPLORER: 'Đặt vé rạp hoặc phát VOD lần đầu để khám phá thể loại mới.',
  PREMIERE: 'Chọn phim vừa khởi chiếu và đặt vé trong 3 ngày đầu.',
  HYBRID_PILOT: 'Xem cùng một phim ở rạp và mua thêm bản VOD.',
  SOCIAL_ORBIT: 'Tham gia phòng Orbit Seat khi tính năng ra mắt.',
  REVIEWER: 'Viết đánh giá có gắn vibe tag trên trang chi tiết phim.',
  MATCHMAKER_EXPLORER: 'Hoàn thành Movie Matchmaker trên trang chủ để ghi nhận tiến độ.',
};

export const MISSION_ACTION_HINTS_BY_TYPE = {
  GENRE_WINDOW: 'Đặt vé rạp hoặc phát VOD lần đầu để khám phá thể loại mới.',
  PREMIERE_BOOKING: 'Chọn phim vừa khởi chiếu và đặt vé trong khung thời gian quy định.',
  HYBRID_THEATER_VOD: 'Xem cùng một phim ở rạp và mua thêm bản VOD.',
  ORBIT_ROOM_JOIN: 'Tham gia phòng Orbit Seat hoặc đặt vé nhóm khi tính năng mở.',
  REVIEW_WITH_VIBE_TAG: 'Viết đánh giá có gắn vibe tag trên trang chi tiết phim.',
  MATCHMAKER_QUIZ: 'Hoàn thành Movie Matchmaker trên trang chủ để ghi nhận tiến độ.',
};

export const getMissionActionHint = (mission) =>
  MISSION_ACTION_HINTS[mission?.code] ||
  MISSION_ACTION_HINTS_BY_TYPE[mission?.conditionType] ||
  null;

export const getMissionCta = (mission, { completed = false, locked = false } = {}) => {
  if (completed || locked) return null;
  if (mission?.code === 'REVIEWER' || mission?.conditionType === 'REVIEW_WITH_VIBE_TAG') {
    return { label: 'Xem phim', to: '/movies' };
  }
  if (mission?.code === 'MATCHMAKER_EXPLORER' || mission?.conditionType === 'MATCHMAKER_QUIZ') {
    return { label: 'Làm quiz', to: '/#movie-matchmaker' };
  }
  if (
    mission?.code === 'PREMIERE' ||
    mission?.code === 'EXPLORER' ||
    mission?.code === 'HYBRID_PILOT' ||
    mission?.conditionType === 'GENRE_WINDOW' ||
    mission?.conditionType === 'PREMIERE_BOOKING' ||
    mission?.conditionType === 'HYBRID_THEATER_VOD'
  ) {
    return { label: 'Khám phá phim', to: '/movies' };
  }
  return null;
};

export const getMissionIconType = (mission, { locked = false, completed = false } = {}) => {
  if (completed) return 'completed';
  if (locked) return 'locked';
  const type = mission?.conditionType;
  const code = mission?.code;
  if (code === 'REVIEWER' || type === 'REVIEW_WITH_VIBE_TAG') return 'review';
  if (code === 'PREMIERE' || code === 'HYBRID_PILOT' || type === 'PREMIERE_BOOKING' || type === 'HYBRID_THEATER_VOD') {
    return 'ticket';
  }
  if (code === 'EXPLORER' || type === 'GENRE_WINDOW') return 'film';
  return 'rocket';
};

export const formatCompletedAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
