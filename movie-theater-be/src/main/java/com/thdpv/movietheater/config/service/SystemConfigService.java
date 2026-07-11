package com.thdpv.movietheater.config.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.config.entity.SystemConfigEntry;
import com.thdpv.movietheater.config.repository.SystemConfigRepository;
import com.thdpv.movietheater.config.cache.CacheNames;
import com.thdpv.movietheater.config.cache.CatalogCacheEvictor;

@Service
public class SystemConfigService {

    private static final String CONFIG_KEY = "default";

    private final SystemConfigRepository systemConfigRepository;
    private final ObjectMapper objectMapper;
    private final CatalogCacheEvictor catalogCacheEvictor;
    private final SystemConfigService self;

    @Value("${app.vod.default-online-price:45000}")
    private BigDecimal fallbackOnlinePrice;

    public SystemConfigService(
            SystemConfigRepository systemConfigRepository,
            ObjectMapper objectMapper,
            CatalogCacheEvictor catalogCacheEvictor,
            @Lazy SystemConfigService self) {
        this.systemConfigRepository = systemConfigRepository;
        this.objectMapper = objectMapper;
        this.catalogCacheEvictor = catalogCacheEvictor;
        this.self = self;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.SYSTEM_CONFIG, key = "'default'")
    public Map<String, Object> getConfig() {
        return systemConfigRepository.findById(CONFIG_KEY)
                .map(entry -> parseConfigJson(entry.getConfigJson()))
                .orElseGet(this::buildDefaultConfig);
    }

    @Transactional
    public Map<String, Object> saveConfig(Map<String, Object> incoming) {
        Map<String, Object> merged = mergeWithDefaults(incoming);
        SystemConfigEntry entry = systemConfigRepository.findById(CONFIG_KEY).orElseGet(() -> {
            SystemConfigEntry created = new SystemConfigEntry();
            created.setConfigKey(CONFIG_KEY);
            return created;
        });
        entry.setConfigJson(writeConfigJson(merged));
        systemConfigRepository.save(entry);
        catalogCacheEvictor.evictSystemConfig();
        return merged;
    }

    public BigDecimal getDefaultOnlinePrice() {
        Object value = self.getConfig().get("onlineStreamingPrice");
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.longValue());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.trim());
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return fallbackOnlinePrice;
    }

    public int getSeatLockMinutes() {
        return readInt(self.getConfig().get("seatLockMinutes"), 5, 1, 30);
    }

    public int getSeatLockTtlSeconds() {
        return getSeatLockMinutes() * 60;
    }

    public int getMaxSeatsPerBooking() {
        return readInt(self.getConfig().get("maxSeatsPerBooking"), 8, 1, 20);
    }

    public double getOnlineWatchLockMultiplier() {
        return readDouble(self.getConfig().get("onlineWatchLockMultiplier"), 2.0, 0.5, 10.0);
    }

    public boolean isOnlineCountdownEnabled() {
        return readBoolean(self.getConfig().get("onlineCountdownEnabled"), true);
    }

    public int getOnlineCountdownWarningMinutes() {
        return readInt(self.getConfig().get("onlineCountdownWarningMinutes"), 10, 1, 120);
    }

    public int getPointsToCashValue() {
        return readInt(self.getConfig().get("pointsToCashValue"), 1000, 1, 1_000_000);
    }

    public int getCancellationCutoffMinutes() {
        return readInt(self.getConfig().get("cancellationCutoffMinutes"), 60, 0, 24 * 60);
    }

    public int getCancellationFeePercent() {
        return readInt(self.getConfig().get("cancellationFeePercent"), 10, 0, 100);
    }

    public boolean isCustomerRefundEnabled() {
        return readBoolean(self.getConfig().get("customerRefundEnabled"), true);
    }

    public boolean isFullRefundOnShowtimeCancel() {
        return readBoolean(self.getConfig().get("fullRefundOnShowtimeCancel"), true);
    }

    public boolean isRefundManualApprovalRequired() {
        return readBoolean(self.getConfig().get("refundManualApprovalRequired"), true);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRoomTypes() {
        Object value = self.getConfig().get("roomTypes");
        if (value instanceof List<?> list && !list.isEmpty()) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            if (!result.isEmpty()) {
                return result;
            }
        }
        return defaultRoomTypes();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getScreeningFormats() {
        Object value = self.getConfig().get("screeningFormats");
        if (value instanceof List<?> list && !list.isEmpty()) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            if (!result.isEmpty()) {
                return result;
            }
        }
        return defaultScreeningFormats();
    }

    private Map<String, Object> mergeWithDefaults(Map<String, Object> incoming) {
        Map<String, Object> merged = buildDefaultConfig();
        if (incoming != null) {
            merged.putAll(incoming);
        }
        if (!(merged.get("roomTypes") instanceof List<?> list) || list.isEmpty()) {
            merged.put("roomTypes", defaultRoomTypes());
        }
        if (!(merged.get("screeningFormats") instanceof List<?> formats) || formats.isEmpty()) {
            merged.put("screeningFormats", defaultScreeningFormats());
        }
        return merged;
    }

    private Map<String, Object> buildDefaultConfig() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("startTime", "08:00");
        defaults.put("endTime", "23:30");
        defaults.put("intervalMinutes", 15);
        defaults.put("trailerBuffer", 10);
        defaults.put("slotStepMinutes", 30);
        defaults.put("gridAlignMinutes", 15);
        defaults.put("fairnessPenalty", 25);
        defaults.put("sameMovieGapMinutes", 30);
        defaults.put("defaultRating", 8.0);
        defaults.put("defaultDurationMinutes", 120);
        defaults.put("weekendScore", 10.0);
        defaults.put("weekdayScore", 0.0);
        defaults.put("includeFridayAsWeekend", true);
        defaults.put("goldenHourPeakStart", "18:00");
        defaults.put("goldenHourPeakEnd", "22:30");
        defaults.put("goldenHourPeakScore", 15.0);
        defaults.put("goldenHourNearStart1", "12:00");
        defaults.put("goldenHourNearEnd1", "18:00");
        defaults.put("goldenHourNearStart2", "22:30");
        defaults.put("goldenHourNearEnd2", "23:59");
        defaults.put("goldenHourNearScore", 8.0);
        defaults.put("genreTierHot", 10.0);
        defaults.put("genreTierMid", 7.0);
        defaults.put("genreTierBase", 4.0);
        defaults.put("genreHotKeywords", List.of("hành động", "viễn tưởng", "hoạt hình"));
        defaults.put("genreMidKeywords", List.of("phiêu lưu", "kịch tính", "tình cảm"));
        defaults.put("previewScoreHigh", 25.0);
        defaults.put("previewScoreMid", 15.0);
        defaults.put("goldenHourWeight", 1.2);
        defaults.put("weekendWeight", 1.5);
        defaults.put("ratingWeight", 1.0);
        defaults.put("genreWeight", 1.1);
        defaults.put("basePrice", 60000);
        defaults.put("vipPrice", 90000);
        defaults.put("couplePrice", 120000);
        defaults.put("onlineStreamingPrice", fallbackOnlinePrice.longValue());
        defaults.put("seatLockMinutes", 5);
        defaults.put("maxSeatsPerBooking", 8);
        defaults.put("onlineWatchLockMultiplier", 2.0);
        defaults.put("onlineCountdownEnabled", true);
        defaults.put("onlineCountdownWarningMinutes", 10);
        defaults.put("pointsEarningRatio", 5);
        defaults.put("pointsToCashValue", 1000);
        defaults.put("sessionTimeoutHours", 24);
        defaults.put("cancellationCutoffMinutes", 60);
        defaults.put("cancellationFeePercent", 10);
        defaults.put("customerRefundEnabled", true);
        defaults.put("fullRefundOnShowtimeCancel", true);
        defaults.put("refundManualApprovalRequired", true);
        defaults.put("roomTypes", defaultRoomTypes());
        defaults.put("screeningFormats", defaultScreeningFormats());
        defaults.put("reviewBannedWords", defaultReviewBannedWords());
        defaults.put("nasaBot", defaultNasaBotConfig());
        return defaults;
    }

    private Map<String, Object> defaultNasaBotConfig() {
        Map<String, Object> bot = new LinkedHashMap<>();
        bot.put("personaPrompt", """
                Bạn là NASA BOT, trợ lý khách hàng chính thức của website đặt vé xem phim NASAFilm.

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

                FAQ HỖ TRỢ THEO DANH MỤC (trả lời ngắn, chính xác):

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

                Khi FAQ không giải quyết được → hướng khách chọn danh mục phù hợp trên widget và mô tả chi tiết \
                (email, mã đơn, thông báo lỗi, thời gian).

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
                - 2-4 câu ngắn/lượt.
                """);
        bot.put("openingQuestions", List.of(
                "Tạo ticket hỗ trợ",
                "Thanh toán bị lỗi",
                "Không đăng nhập được",
                "Xem tình trạng ticket"));
        bot.put("shortcuts", List.of(
                shortcutEntry("Vé / suất chiếu", "ticket_support", "Hỗ trợ mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé", "Tôi cần hỗ trợ về vé hoặc suất chiếu."),
                shortcutEntry("Thanh toán", "payment_support", "Hỗ trợ giao dịch lỗi, bị trừ tiền, chưa nhận vé, hoàn tiền", "Tôi cần hỗ trợ về thanh toán."),
                shortcutEntry("Tài khoản", "account_support", "Đăng nhập, OTP email, quên mật khẩu, Google OAuth, khóa tài khoản", "Tôi không đăng nhập được và cần hỗ trợ tài khoản."),
                shortcutEntry("Khuyến mãi", "promo_support", "Voucher, combo bắp nước, mã giảm giá, trang Offers", "Tôi cần hỗ trợ về voucher hoặc khuyến mãi."),
                shortcutEntry("Hội viên", "membership_support", "Điểm thưởng, hạng NASA Member/Friend/VIP, quyền lợi combo", "Tôi cần hỗ trợ về hội viên và điểm thưởng."),
                shortcutEntry("Mô tả vấn đề khác", "other_support", "Gửi mô tả ngắn cho các vấn đề chưa thuộc nhóm có sẵn", "Tôi có một vấn đề khác và cần được hỗ trợ.")));
        bot.put("categoryKeywords", Map.of(
                "ticket", List.of("ve", "ticket", "dat ve", "ma ve", "ma don", "suat chieu", "lich chieu", "ghe", "doi ve", "hoan ve", "huy ve", "phong chieu"),
                "payment", List.of("thanh toan", "payment", "giao dich", "refund", "hoan tien", "tru tien", "chua nhan ve", "zalopay", "momo", "vnpay", "the ngan hang"),
                "account", List.of("tai khoan", "account", "login", "dang nhap", "dang ky", "otp", "mat khau", "quen mat khau", "khoa tai khoan", "profile"),
                "promo", List.of("voucher", "khuyen mai", "promo", "ma giam gia", "uu dai", "coupon", "combo", "bap nuoc"),
                "membership", List.of("hoi vien", "membership", "vip", "diem", "diem thuong", "tich diem", "hang thanh vien", "quyen loi")));
        bot.put("bannedWords", List.of("dm", "dmm", "dit", "dit me", "du ma", "duma", "clm", "cc", "lon", "cac", "cai lon", "chui", "fuck", "shit", "bitch"));
        return bot;
    }

    @SuppressWarnings("unchecked")
    public List<String> getReviewBannedWords() {
        Object value = self.getConfig().get("reviewBannedWords");
        if (!(value instanceof List<?> rawList)) {
            return defaultReviewBannedWords();
        }
        List<String> words = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof String text && !text.isBlank()) {
                words.add(text.trim().toLowerCase());
            }
        }
        return words.isEmpty() ? defaultReviewBannedWords() : words;
    }

    @Transactional
    public List<String> updateReviewBannedWords(List<String> incomingWords) {
        Map<String, Object> config = new LinkedHashMap<>(self.getConfig());
        List<String> normalized = new ArrayList<>();
        if (incomingWords != null) {
            for (String word : incomingWords) {
                if (word != null) {
                    String trimmed = word.trim().toLowerCase();
                    if (!trimmed.isEmpty() && !normalized.contains(trimmed)) {
                        normalized.add(trimmed);
                    }
                }
            }
        }
        config.put("reviewBannedWords", normalized);
        saveConfig(config);
        return normalized;
    }

    private List<String> defaultReviewBannedWords() {
        return List.of(
                "lua dao",
                "scam",
                "spam",
                "khong xem",
                "rac",
                "vo van",
                "ngu",
                "dit",
                "lon",
                "cặc",
                "địt",
                "lồn");
    }

    private List<Map<String, Object>> defaultRoomTypes() {
        List<Map<String, Object>> types = new ArrayList<>();
        types.add(roomTypeEntry("STANDARD", "Standard 2D/3D", true));
        types.add(roomTypeEntry("IMAX", "IMAX Laser", true));
        types.add(roomTypeEntry("VIP", "VIP Gold Class", true));
        types.add(roomTypeEntry("DOLBY_ATMOS", "Dolby Atmos", true));
        types.add(roomTypeEntry("FOUR_DX", "4DX Motion Cinema", true));
        return types;
    }

    private List<Map<String, Object>> defaultScreeningFormats() {
        List<Map<String, Object>> formats = new ArrayList<>();
        formats.add(formatEntry("2D", "2D Phụ đề / Lồng tiếng", true));
        formats.add(formatEntry("3D", "3D", true));
        formats.add(formatEntry("IMAX", "IMAX Laser", true));
        formats.add(formatEntry("4DX", "4DX Motion", true));
        formats.add(formatEntry("DOLBY_ATMOS", "Dolby Atmos", true));
        formats.add(formatEntry("SCREENX", "ScreenX", true));
        return formats;
    }

    private Map<String, Object> roomTypeEntry(String value, String label, boolean enabled) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("value", value);
        entry.put("label", label);
        entry.put("enabled", enabled);
        return entry;
    }

    private Map<String, Object> formatEntry(String value, String label, boolean enabled) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("value", value);
        entry.put("label", label);
        entry.put("enabled", enabled);
        return entry;
    }

    private Map<String, Object> shortcutEntry(String buttonName, String shortcutName, String description, String queryContent) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("buttonName", buttonName);
        entry.put("shortcutName", shortcutName);
        entry.put("description", description);
        entry.put("queryContent", queryContent);
        return entry;
    }

    private int readInt(Object value, int fallback, int min, int max) {
        int parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.intValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private double readDouble(Object value, double fallback, double min, double max) {
        double parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.doubleValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private boolean readBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String text && !text.isBlank()) {
            return Boolean.parseBoolean(text.trim());
        }
        return fallback;
    }

    private Map<String, Object> parseConfigJson(String json) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {
            });
            return mergeWithDefaults(parsed);
        } catch (Exception e) {
            return buildDefaultConfig();
        }
    }

    private String writeConfigJson(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể lưu cấu hình hệ thống", e);
        }
    }
}
