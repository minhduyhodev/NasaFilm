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
    description: 'Đăng nhập, OTP email, quên mật khẩu, Google OAuth, khóa tài khoản',
    queryContent: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.',
  },
  {
    buttonName: 'Khuyến mãi',
    shortcutName: 'promo_support',
    description: 'Voucher, combo bắp nước, mã giảm giá, trang Offers',
    queryContent: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.',
  },
  {
    buttonName: 'Hội viên',
    shortcutName: 'membership_support',
    description: 'Điểm thưởng, hạng NASA Member/Friend/VIP, quyền lợi combo',
    queryContent: 'Tôi cần hỗ trợ về hội viên và điểm thưởng.',
  },
  {
    buttonName: 'Mô tả vấn đề khác',
    shortcutName: 'other_support',
    description: 'Gửi mô tả ngắn cho các vấn đề chưa thuộc nhóm có sẵn',
    queryContent: 'Tôi có một vấn đề khác và cần được hỗ trợ.',
  },
];


export const DEFAULT_NASA_BOT_CATEGORY_KEYWORDS = {
  ticket: ['vé', 'ticket', 'đặt vé', 'mã vé', 'mã đơn', 'suất chiếu', 'lịch chiếu', 'ghế', 'đổi vé', 'hoàn vé', 'hủy vé', 'phòng chiếu'],
  payment: ['thanh toán', 'payment', 'giao dịch', 'refund', 'hoàn tiền', 'trừ tiền', 'chưa nhận vé', 'zalopay', 'momo', 'vnpay', 'thẻ ngân hàng'],
  account: ['tài khoản', 'account', 'login', 'đăng nhập', 'đăng ký', 'otp', 'mật khẩu', 'quên mật khẩu', 'khóa tài khoản', 'profile'],
  promo: ['voucher', 'khuyến mãi', 'promo', 'mã giảm giá', 'ưu đãi', 'coupon', 'combo', 'bắp nước'],
  membership: ['hội viên', 'membership', 'vip', 'điểm', 'điểm thưởng', 'tích điểm', 'hạng thành viên', 'quyền lợi'],
};

export const DEFAULT_NASA_BOT_BANNED_WORDS = ['dm', 'dmm', 'dit', 'dit me', 'du ma', 'duma', 'clm', 'cc', 'lon', 'cac', 'cai lon', 'chui', 'fuck', 'shit', 'bitch'];

/** FAQ tham chiếu cho admin + block gắn vào personaPrompt mặc định */
export const DEFAULT_NASA_BOT_SUPPORT_FAQS = [
  {
    key: 'account',
    label: 'Tài khoản',
    summary: 'Đăng nhập, OTP, mật khẩu',
    items: [
      {
        q: 'Quên mật khẩu?',
        a: 'Vào Quên mật khẩu trên trang đăng nhập, nhập email đã đăng ký, kiểm tra hộp thư (kể cả spam) để lấy link đặt lại mật khẩu.',
      },
      {
        q: 'Không nhận OTP đăng ký?',
        a: 'OTP 6 số gửi qua email đăng ký. Có thời gian chờ giữa các lần gửi; nhập sai nhiều lần có thể bị khóa tạm. Kiểm tra spam và đợi vài phút trước khi gửi lại.',
      },
      {
        q: 'Không đăng nhập được?',
        a: 'Kiểm tra email/mật khẩu, Caps Lock, tài khoản đã kích hoạt chưa. Có thể thử Google OAuth nếu đã liên kết. Vẫn lỗi → chọn danh mục Tài khoản và mô tả thông báo lỗi trên màn hình.',
      },
      {
        q: 'Cập nhật thông tin cá nhân?',
        a: 'Vào Profile để sửa họ tên, số điện thoại. Mật khẩu tối thiểu 8 ký tự, có hoa + thường + số + ký tự đặc biệt.',
      },
    ],
  },
  {
    key: 'promo',
    label: 'Khuyến mãi',
    summary: 'Voucher, combo, mã giảm giá',
    items: [
      {
        q: 'Mã voucher không áp dụng được?',
        a: 'Kiểm tra mã đúng chính tả, còn hạn, đủ điều kiện (hạng hội viên, đơn tối thiểu). Voucher đổi điểm phải đổi trong Offers/ví voucher trước khi thanh toán.',
      },
      {
        q: 'Combo bắp nước không giảm giá?',
        a: 'Giảm combo theo lifetimeScore: NASA Friend (≥5.000 điểm) giảm 10%, NASA VIP (≥10.000) giảm 15%. NASA Member chưa có giảm combo.',
      },
      {
        q: 'Voucher hết hạn hoặc hết lượt?',
        a: 'Mỗi chương trình có thời gian hiệu lực và giới hạn lượt dùng. Xem voucher đang active tại trang Offers.',
      },
      {
        q: 'Báo chưa đủ hạng để đổi voucher?',
        a: 'Một số voucher yêu cầu NASA Friend (≥5.000 lifetime) hoặc NASA VIP (≥10.000). Kiểm tra hạng tại Profile/Missions.',
      },
    ],
  },
  {
    key: 'membership',
    label: 'Hội viên',
    summary: 'Điểm thưởng, hạng thành viên, quyền lợi',
    items: [
      {
        q: 'Sao chưa cộng điểm sau mua vé?',
        a: 'Điểm chỉ cộng khi thanh toán thành công: mỗi 10.000đ thực trả = 1 điểm (làm tròn xuống). Kiểm tra Profile sau vài phút.',
      },
      {
        q: 'Hạng thành viên tính thế nào?',
        a: 'Theo lifetimeScore (điểm tích lũy): NASA Member (0), NASA Friend (≥5.000), NASA VIP (≥10.000). Khác với điểm đang có thể tiêu.',
      },
      {
        q: 'Dùng điểm thanh toán?',
        a: '1 điểm = 1.000đ, không âm, không vượt giá đơn. Hủy/hoàn vé → hoàn điểm đã dùng và trừ điểm đã tích của đơn đó.',
      },
      {
        q: 'Quyền lợi hội viên?',
        a: 'Giảm combo bắp nước (Friend 10%, VIP 15%), đổi voucher theo hạng, nhiệm vụ Missions cộng thêm điểm.',
      },
    ],
  },
];

export const DEFAULT_NASA_BOT_FAQ_PROMPT = `FAQ HỖ TRỢ THEO DANH MỤC (trả lời ngắn, chính xác):

👤 TÀI KHOẢN — đăng nhập, OTP, mật khẩu:
- Quên MK: trang Quên mật khẩu → email → link reset (kiểm tra spam).
- OTP đăng ký: gửi qua email, có cooldown, sai nhiều lần có thể khóa tạm.
- Đăng nhập: email + MK hoặc Google OAuth; cần kích hoạt tài khoản.
- Profile: cập nhật họ tên, SĐT; MK tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt).

🎁 KHUYẾN MÃI — voucher, combo, mã giảm giá:
- Nhập mã ở bước thanh toán; voucher đổi điểm phải đổi trong Offers trước.
- Lỗi thường gặp: hết hạn, chưa đủ hạng, hết lượt, chưa đổi điểm kích hoạt.
- Combo: Friend giảm 10%, VIP giảm 15% (theo lifetimeScore).

👑 HỘI VIÊN — điểm, hạng, quyền lợi:
- Tích điểm: floor(tổng tiền thực trả / 10.000đ) sau thanh toán thành công.
- Hạng (lifetimeScore): Member 0 · Friend ≥5.000 · VIP ≥10.000.
- Quy đổi: 1 điểm = 1.000đ; hoàn/hủy vé điều chỉnh điểm tương ứng.

Khi FAQ không giải quyết được → hướng khách chọn danh mục phù hợp trên widget và mô tả chi tiết (email, mã đơn, thông báo lỗi, thời gian).`;

export const DEFAULT_NASA_BOT_CONFIG = {
  personaPrompt: `Bạn là NASA BOT, trợ lý khách hàng chính thức của website đặt vé xem phim NASAFilm.

VAI TRÒ CỦA BẠN: Trả lời các câu hỏi CHUNG về NASAFilm — phim, rạp, suất chiếu, chính sách, \
tính năng website, hướng dẫn sử dụng. Bạn KHÔNG thu thập thông tin để tạo ticket hỗ trợ \
(hệ thống tự xử lý luồng đó).

PHẠM VI:
- Chỉ trả lời nội dung liên quan NASAFilm.
- Ngoài phạm vi → trả lời: "Câu hỏi không thuộc phạm vi hỗ trợ của Nasa."

KIẾN THỨC VỀ NASAFILM:
- Phim: đang chiếu, sắp chiếu, thể loại, quốc gia, đạo diễn, diễn viên, độ tuổi, thời lượng, \
trailer, review + vibe tag, Movie Matchmaker quiz.
- Suất chiếu & Rạp: 2D/3D/IMAX/4DX/Dolby/ScreenX, Standard/VIP/IMAX, \
ghế thường/VIP/couple, thời lượng + 10 phút buffer trailer.
- Đặt vé: chọn phim → suất → ghế → combo → thanh toán → QR. Giữ ghế 5 phút. Tối đa 8 ghế/lần.
- Chính sách hủy: trước giờ chiếu 60 phút, phí 10%. Rạp hủy suất → hoàn 100%.
- Thanh toán: Momo, VNPay, ZaloPay, thẻ NH.
- Tài khoản: đăng ký, đăng nhập, Google OAuth, OTP email 6 số, quên MK, kích hoạt tài khoản, khóa/mở khóa.
- Hội viên: NASA Member (0), NASA Friend (≥5.000 lifetime), NASA VIP (≥10.000 lifetime). \
Tích điểm floor(tổng tiền thực trả/10.000đ). 1 điểm = 1.000đ. Giảm combo Friend 10%, VIP 15%.
- Missions: EXPLORER, PREMIERE, HYBRID_PILOT, SOCIAL_ORBIT, REVIEWER, MATCHMAKER_EXPLORER. \
ONCE/WEEKLY/MONTHLY. Badge, campaign.
- Orbit Rooms: đặt vé nhóm realtime, mời bạn, checkout riêng.
- VOD: mua/xem online, My Movies, đồng hồ đếm ngược.
- Concessions: combo bắp nước đặt kèm vé.
- Khuyến mãi: voucher, coupon, điều kiện áp dụng, trang Offers, voucher đổi điểm.
- Ticket hỗ trợ & Live Support: tạo ticket, chat admin/staff, gọi staff online.
- Wallet, Reminders, FAQ, PreShow Boarding, Counter, check-in QR.

${DEFAULT_NASA_BOT_FAQ_PROMPT}

QUY TẮC:
- Nội dung chửi tục/xúc phạm → "Vui lòng nhắn nội dung phù hợp."
- Chào hỏi → chào lại ngắn + hỏi cần hỗ trợ gì.
- Mơ hồ → hỏi 1 câu làm rõ.
- Hỏi chính sách → trả lời ngắn gọn, chính xác.
- KHÔNG bịa dữ liệu (đơn hàng, vé, điểm, lịch chiếu...). Không hỏi email/SĐT.
- KHÔNG hứa hoàn tiền/đổi vé nếu chưa có admin kiểm tra.
- KHÔNG tự ý tạo ticket hay thu thập thông tin ticket (hệ thống có luồng riêng). \
Nếu khách cần hỗ trợ vé/thanh toán/tài khoản/khuyến mãi/hội viên → \
chỉ cần xác nhận đã hiểu vấn đề và nói: \
"Mình sẽ mở form hỗ trợ cho bạn. Bạn làm theo từng bước nhé!"

PHONG CÁCH:
- Tiếng Việt, lịch sự, thân thiện.
- 2-4 câu ngắn/lượt.`,
  openingQuestions: [
    'Tạo ticket hỗ trợ',
    'Thanh toán bị lỗi',
    'Không đăng nhập được',
    'Xem tình trạng ticket',
  ],
  shortcuts: DEFAULT_NASA_BOT_SHORTCUTS,
  categoryKeywords: DEFAULT_NASA_BOT_CATEGORY_KEYWORDS,
  bannedWords: DEFAULT_NASA_BOT_BANNED_WORDS,
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
  orbitRoomTtlMinutes: 30,
  orbitCheckoutTtlMinutes: 15,
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
