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
  { id: 'ticket', label: 'Vé / suất chiếu', description: 'Hỗ trợ mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé' },
  { id: 'payment', label: 'Thanh toán', description: 'Hỗ trợ giao dịch lỗi, bị trừ tiền, chưa nhận vé, hoàn tiền' },
  { id: 'account', label: 'Tài khoản', description: 'Hỗ trợ đăng nhập, OTP, mật khẩu, lỗi tài khoản' },
  { id: 'promo', label: 'Khuyến mãi', description: 'Hỗ trợ voucher, combo, ưu đãi, mã giảm giá' },
  { id: 'membership', label: 'Hội viên', description: 'Hỗ trợ điểm thưởng, hạng thành viên, quyền lợi hội viên' },
  { id: 'other', label: 'Mô tả vấn đề khác', description: 'Gửi mô tả ngắn cho các vấn đề chưa thuộc nhóm có sẵn' },
];

export const DEFAULT_NASA_BOT_CONFIG = {
  title: 'NASA Bot',
  mode: 'Single Agent (LLM Mode)',
  billingEnabled: true,
  model: 'gpt-4o-mini',
  provider: 'OpenAI',
  temperature: 0.2,
  topP: 1,
  contextRounds: 8,
  responseMaxLength: 1024,
  personaPrompt: `Bạn là NASA BOT, trợ lý hỗ trợ khách hàng cho hệ thống rạp phim NASAFilm.

Vai trò:
- Trả lời ngắn gọn, thân thiện, giống nhân viên CSKH qua chat.
- Phân loại vấn đề thành ticket, payment, account, promo, membership, other.
- Nếu cần admin xử lý thì gợi ý tạo ticket.
- Không hỏi email, số điện thoại vì hệ thống đã gắn tài khoản đăng nhập.`,
  pluginsEnabled: false,
  workflowsEnabled: false,
  knowledgeAutoCall: true,
  knowledgeTextSummary: 'Chính sách hỗ trợ, FAQ, quy trình xử lý ticket, đổi lịch chiếu, thanh toán và hội viên.',
  knowledgeTableSummary: 'Bảng danh mục ticket, trạng thái ticket, mapping shortcut và opening questions.',
  knowledgeImageSummary: 'Ảnh banner, background, avatar và hình minh họa cho chatbox.',
  memoryVariablesSummary: 'current_user, selected_category, current_ticket_code, live_support_state',
  memoryDatabaseSummary: 'Lưu cấu hình shortcut, opening questions, knowledge notes và prompt hoạt động.',
  openingQuestions: [
    'Tạo ticket hỗ trợ',
    'Thanh toán bị lỗi',
    'Không đăng nhập được',
    'Xem tình trạng ticket',
  ],
  autoSuggestionEnabled: true,
  autoSuggestionPrompt: 'Sau mỗi phản hồi, gợi ý 3 câu hỏi tiếp theo phù hợp với ngữ cảnh hội thoại hiện tại.',
  shortcuts: DEFAULT_NASA_BOT_SHORTCUTS,
  backgroundImageUrl: '',
};

export const DEFAULT_SYSTEM_CONFIG = {
  startTime: '08:00',
  endTime: '23:30',
  intervalMinutes: 15,
  trailerBuffer: 10,
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
