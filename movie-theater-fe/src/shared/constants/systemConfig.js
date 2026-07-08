export const SYSTEM_CONFIG_STORAGE_KEY = 'lorafilm_system_config';

export const DEFAULT_ROOM_TYPES = [
  { value: 'STANDARD', label: 'Standard 2D/3D', enabled: true },
  { value: 'IMAX', label: 'IMAX Laser', enabled: true },
  { value: 'VIP', label: 'VIP Gold Class', enabled: true },
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos', enabled: true },
  { value: 'FOUR_DX', label: '4DX Motion Cinema', enabled: true },
];

export const DEFAULT_SCREENING_FORMATS = [
  { value: '2D', label: '2D Phụ đề / Lồng tiếng', enabled: true },
  { value: '3D', label: '3D', enabled: true },
  { value: 'IMAX', label: 'IMAX Laser', enabled: true },
  { value: '4DX', label: '4DX Motion', enabled: true },
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos', enabled: true },
  { value: 'SCREENX', label: 'ScreenX', enabled: true },
];

export const DEFAULT_NASA_BOT_SHORTCUTS = [
  {
    buttonName: 'Vé / suất chiếu',
    shortcutName: 'ticket_support',
    description: 'Hỗ trợ mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé',
    queryContent: 'Tôi cần hỗ trợ về vé hoặc suất chiếu.',
  },
  {
    buttonName: 'Thanh toán',
    shortcutName: 'payment_support',
    description: 'Hỗ trợ giao dịch lỗi, bị trừ tiền, chưa nhận vé, hoàn tiền',
    queryContent: 'Tôi cần hỗ trợ về thanh toán.',
  },
  {
    buttonName: 'Tài khoản',
    shortcutName: 'account_support',
    description: 'Hỗ trợ đăng nhập, OTP, mật khẩu, lỗi tài khoản',
    queryContent: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.',
  },
  {
    buttonName: 'Khuyến mãi',
    shortcutName: 'promo_support',
    description: 'Hỗ trợ voucher, combo, ưu đãi, mã giảm giá',
    queryContent: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.',
  },
  {
    buttonName: 'Hội viên',
    shortcutName: 'membership_support',
    description: 'Hỗ trợ điểm thưởng, hạng thành viên, quyền lợi hội viên',
    queryContent: 'Tôi cần hỗ trợ về hội viên và điểm thưởng.',
  },
  {
    buttonName: 'Mô tả vấn đề khác',
    shortcutName: 'other_support',
    description: 'Gửi mô tả ngắn cho các vấn đề chưa thuộc nhóm có sẵn',
    queryContent: 'Tôi có một vấn đề khác và cần được hỗ trợ.',
  },
];

export const DEFAULT_NASA_BOT_CONFIG = {
  personaPrompt: `Bạn là NASA BOT, trợ lý hỗ trợ khách hàng của NASAFilm.

Nhiệm vụ:
- Trả lời ngắn gọn, thân thiện.
- Tự phân loại yêu cầu thành các nhóm: ticket, payment, account, promo, membership, other.
- Nếu người dùng chọn shortcut hoặc nhập nội dung tương ứng, hiểu ngay nhóm vấn đề đó.
- Không hỏi email hoặc số điện thoại vì hệ thống đã biết tài khoản đăng nhập.
- Nếu thiếu thông tin, chỉ hỏi thêm 1 câu ngắn mỗi lượt.
- Nếu cần admin xử lý, hướng người dùng mô tả ngắn để tạo ticket.

Gợi ý phân loại:
- Vé, mã đơn, suất chiếu, ghế, đổi/hoàn vé -> ticket
- Thanh toán, giao dịch lỗi, bị trừ tiền, hoàn tiền -> payment
- Đăng nhập, OTP, mật khẩu, lỗi tài khoản -> account
- Voucher, combo, khuyến mãi -> promo
- Điểm thưởng, hạng thành viên, quyền lợi -> membership
- Còn lại -> other

Phong cách:
- Ngắn, rõ, giống nhân viên CSKH chat.
- Không bịa dữ liệu hệ thống.
- Không nói quá dài.`,
  openingQuestions: [
    'Tạo ticket hỗ trợ',
    'Thanh toán bị lỗi',
    'Không đăng nhập được',
    'Xem tình trạng ticket',
  ],
  shortcuts: DEFAULT_NASA_BOT_SHORTCUTS,
};

export const DEFAULT_SYSTEM_CONFIG = {
  startTime: '08:00',
  endTime: '23:30',
  intervalMinutes: 15,
  trailerBuffer: 10,
  slotStepMinutes: 30,
  gridAlignMinutes: 15,
  fairnessPenalty: 25,
  sameMovieGapMinutes: 30,
  defaultRating: 8,
  defaultDurationMinutes: 120,
  weekendScore: 10,
  weekdayScore: 0,
  includeFridayAsWeekend: true,
  goldenHourPeakStart: '18:00',
  goldenHourPeakEnd: '22:30',
  goldenHourPeakScore: 15,
  goldenHourNearStart1: '12:00',
  goldenHourNearEnd1: '18:00',
  goldenHourNearStart2: '22:30',
  goldenHourNearEnd2: '23:59',
  goldenHourNearScore: 8,
  genreTierHot: 10,
  genreTierMid: 7,
  genreTierBase: 4,
  genreHotKeywords: ['hành động', 'viễn tưởng', 'hoạt hình'],
  genreMidKeywords: ['phiêu lưu', 'kịch tính', 'tình cảm'],
  previewScoreHigh: 25,
  previewScoreMid: 15,
  goldenHourWeight: 1.2,
  weekendWeight: 1.5,
  ratingWeight: 1.0,
  genreWeight: 1.1,
  basePrice: 60000,
  vipPrice: 90000,
  couplePrice: 120000,
  onlineStreamingPrice: 45000,
  seatLockMinutes: 5,
  maxSeatsPerBooking: 8,
  onlineWatchLockMultiplier: 2,
  onlineCountdownEnabled: true,
  onlineCountdownWarningMinutes: 10,
  pointsEarningRatio: 5,
  pointsToCashValue: 1000,
  sessionTimeoutHours: 24,
  cancellationCutoffMinutes: 60,
  cancellationFeePercent: 10,
  customerRefundEnabled: true,
  fullRefundOnShowtimeCancel: true,
  refundManualApprovalRequired: true,
  roomTypes: DEFAULT_ROOM_TYPES,
  screeningFormats: DEFAULT_SCREENING_FORMATS,
  reviewBannedWords: [],
  nasaBot: DEFAULT_NASA_BOT_CONFIG,
};
