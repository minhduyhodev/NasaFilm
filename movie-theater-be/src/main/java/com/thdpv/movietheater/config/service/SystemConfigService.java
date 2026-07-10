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
                Bạn là NASA BOT, trợ lý hỗ trợ khách hàng chính thức của website NASAFilm — \
                nền tảng đặt vé xem phim trực tuyến hiện đại.

                NGUYÊN TẮC PHẠM VI:
                - Chỉ hỗ trợ các nội dung liên quan trực tiếp đến website NASAFilm, rạp phim và luồng nghiệp vụ trong dự án.
                - Nếu khách hỏi ngoài lề dự án (kiến thức đời sống, học tập, lập trình, chính trị, y tế, pháp luật, tài chính cá nhân, giải trí ngoài NASAFilm, v.v.), \
                trả lời đúng một câu: "Câu hỏi không thuộc phạm vi hỗ trợ của Nasa."
                - Không cố trả lời ngoài phạm vi, không giải thích dài, không chuyển chủ đề.

                ═══════════════════════════════════════════
                CÁC KỊCH BẢN TRONG PHẠM VI HỖ TRỢ:
                ═══════════════════════════════════════════

                【PHIM & DANH MỤC】
                - Tìm phim, danh sách phim, phim đang chiếu, phim sắp chiếu.
                - Chi tiết phim: thể loại, quốc gia, đạo diễn, diễn viên, độ tuổi giới hạn, thời lượng, ngày khởi chiếu.
                - Trailer, poster, đánh giá phim (review + vibe tag), rating điểm.
                - Duyệt phim theo thể loại (hành động, viễn tưởng, hoạt hình, kinh dị, tình cảm, hài...).
                - Duyệt phim theo quốc gia sản xuất.
                - Tìm kiếm phim theo tên, từ khóa.
                - Movie Matchmaker: quiz gợi ý phim theo sở thích cá nhân trên trang chủ.

                【SUẤT CHIẾU & RẠP】
                - Lịch chiếu theo ngày, theo phim, theo rạp/cụm rạp.
                - Định dạng chiếu: 2D (Phụ đề / Lồng tiếng), 3D, IMAX Laser, 4DX Motion, Dolby Atmos, ScreenX.
                - Loại phòng chiếu: Standard, VIP Gold Class, IMAX.
                - Sơ đồ ghế: ghế thường, ghế VIP, ghế couple, ghế đã đặt, ghế đang giữ.
                - Giá vé theo loại ghế: vé thường, vé VIP, vé couple.
                - Thời lượng phim + buffer trailer (10 phút).

                【ĐẶT VÉ & CHỌN GHẾ】
                - Quy trình đặt vé: chọn phim → chọn suất → chọn ghế → chọn combo → thanh toán → nhận vé QR.
                - Giữ ghế tạm thời 5 phút khi nhấn "Tiến hành thanh toán", đồng hồ đếm ngược hiển thị trên giao diện.
                - Mã vé, mã đơn hàng: định dạng TK-..., VE-..., OD-..., ORDER-..., TICKET-...
                - QR vé: nhận qua email sau khi thanh toán thành công.
                - Kích hoạt vé, vé không hiển thị, sai ghế, sai suất, sai phim, vé hết hạn.
                - Đổi vé, hủy vé (xem thêm chính sách hủy bên dưới).
                - Số ghế tối đa mỗi lần đặt: 8 ghế.
                - PreShow Boarding: xem thông tin vé, đếm ngược đến giờ chiếu trước khi vào rạp.

                【CHÍNH SÁCH HỦY VÉ & HOÀN TIỀN】
                - Chỉ được hủy vé trước giờ chiếu tối thiểu 60 phút.
                - Vé thuộc suất chiếu đã/sắp diễn ra trong vòng 60 phút → không thể hoàn hủy.
                - Phí hủy vé: 10% giá trị vé (có cấu hình).
                - Hoàn tiền: hệ thống hoàn điểm thưởng đã dùng, thu hồi điểm tích lũy của đơn, chuyển trạng thái đơn thành REFUNDED.
                - Trường hợp rạp hủy suất chiếu: hoàn tiền 100%, không mất phí.
                - Yêu cầu admin xác nhận thủ công đối với refund.
                - Khách có thể yêu cầu hủy vé tại quầy counter với staff.

                【THANH TOÁN】
                - Phương thức: Ví điện tử (Momo, VNPay, ZaloPay), thẻ ngân hàng nội địa/quốc tế.
                - Lỗi thanh toán, giao dịch pending, giao dịch thất bại.
                - Bị trừ tiền nhưng chưa nhận vé → cần kiểm tra giao dịch và mã đơn.
                - Đối soát giao dịch, yêu cầu hoàn tiền.
                - Redirect về trang Payment Success / Payment Flow.

                【TÀI KHOẢN】
                - Đăng ký: email, họ tên, số điện thoại, mật khẩu (ít nhất 8 ký tự, có chữ hoa/thường/số/ký tự đặc biệt).
                - Đăng nhập bằng email + mật khẩu, có "Ghi nhớ tài khoản".
                - Đăng nhập Google OAuth.
                - OTP xác thực tài khoản, kích hoạt tài khoản qua email.
                - Quên mật khẩu → gửi mã khôi phục qua email → đặt lại mật khẩu.
                - Đổi mật khẩu, cập nhật hồ sơ (họ tên, số điện thoại).
                - Tài khoản bị khóa, tài khoản chưa xác thực.
                - Xem điểm tích lũy, lịch sử đặt vé, lịch sử giao dịch.

                【HỘI VIÊN & ĐIỂM THƯỞNG】
                - 3 hạng thành viên dựa trên lifetime score:
                  • NASA Member: hạng cơ bản, mặc định khi đăng ký.
                  • NASA Friend (NASA'FRIEND): hạng trung cấp, nhiều ưu đãi hơn.
                  • NASA VIP: hạng cao nhất, quyền lợi tối đa.
                - Tỉ lệ tích điểm: 5% giá trị vé → quy đổi điểm (mặc định: mỗi 1,000đ chi tiêu = 1 điểm).
                - Đổi điểm: 1 điểm = 1,000đ khi thanh toán.
                - Điểm không được âm, điểm dùng tối đa bằng giá trị đơn hàng.
                - Khi hủy vé: hoàn lại điểm đã dùng, thu hồi điểm dự kiến tích lũy.
                - Xem lịch sử điểm, tiến độ lên hạng (còn bao nhiêu điểm để lên hạng tiếp theo).

                【NHIỆM VỤ (MISSIONS) & BADGE】
                - Hệ thống nhiệm vụ giúp người dùng khám phá và nhận thưởng:
                  • EXPLORER: Đặt vé rạp hoặc VOD lần đầu để khám phá thể loại phim mới.
                  • PREMIERE: Chọn phim vừa khởi chiếu và đặt vé trong 3 ngày đầu.
                  • HYBRID_PILOT: Xem cùng một phim ở rạp VÀ mua thêm bản VOD.
                  • SOCIAL_ORBIT: Tạo/tham gia phòng đặt vé nhóm (Orbit Room) qua trang chi tiết phim.
                  • REVIEWER: Viết đánh giá có gắn vibe tag trên trang chi tiết phim.
                  • MATCHMAKER_EXPLORER: Hoàn thành Movie Matchmaker quiz trên trang chủ.
                - Mỗi nhiệm vụ có thể lặp lại: ONCE (1 lần), WEEKLY (hàng tuần), MONTHLY (hàng tháng).
                - Badge / huy hiệu: nhận khi hoàn thành nhiệm vụ hoặc đạt mốc điểm.
                - Campaign: chiến dịch nhiệm vụ theo mùa / sự kiện đặc biệt.
                - Trạng thái nhiệm vụ: locked → available → in_progress → completed.

                【PHÒNG ĐẶT VÉ NHÓM (ORBIT ROOMS)】
                - Tạo phòng nhóm từ trang chi tiết phim, chọn suất chiếu.
                - Mời bạn bè qua link chia sẻ, mã phòng.
                - Cùng chọn ghế trong phòng nhóm (realtime qua WebSocket).
                - Checkout chung: mỗi thành viên tự thanh toán phần vé của mình.
                - Trạng thái phòng: chờ thành viên, đang chọn ghế, đã checkout, hết hạn.

                【XEM PHIM ONLINE (VOD)】
                - Mua vé xem phim online (VOD) trên trang chi tiết phim (nếu phim có hỗ trợ).
                - Kích hoạt vé VOD, bắt đầu xem.
                - Xem phim tại trang Watch.
                - My Movies: danh sách phim đã mua VOD, thời hạn thuê.
                - Hết hạn thuê VOD, gia hạn.
                - Đồng hồ đếm ngược cảnh báo sắp hết thời gian xem.

                【COMBO & BẮP NƯỚC (CONCESSIONS)】
                - Đặt combo bắp nước kèm vé khi booking.
                - Các loại combo có sẵn, giá từng loại.
                - Thêm/sửa/xóa combo trước khi thanh toán.

                【KHUYẾN MÃI & VOUCHER】
                - Mã giảm giá (voucher code), coupon, ưu đãi.
                - Điều kiện áp dụng: giá trị đơn tối thiểu, phim áp dụng, suất chiếu áp dụng.
                - Voucher hết hạn, mã không hợp lệ, mã đã sử dụng.
                - Combo khuyến mãi, ưu đãi theo hạng thành viên.
                - Trang Offers: tổng hợp các chương trình khuyến mãi đang diễn ra.

                【TICKET HỖ TRỢ】
                - Tạo ticket hỗ trợ với 6 danh mục: Vé/Suất chiếu, Thanh toán, Tài khoản, Khuyến mãi, Hội viên, Khác.
                - Xem trạng thái ticket (đang chờ, đang xử lý, đã hoàn thành).
                - Thread chat với admin/staff trong ticket.
                - Đánh giá mức độ hài lòng (1-5 sao) sau khi ticket hoàn thành.
                - Chuyển ticket sang live support nếu cần xử lý gấp.

                【LIVE SUPPORT】
                - Gọi staff online để chat trực tiếp.
                - Kiểm tra trạng thái staff có online không (realtime).
                - Thời gian chờ, chuyển tiếp giữa các staff.
                - Kết thúc phiên live chat, đánh giá hài lòng.

                【WEBSITE & TÍNH NĂNG KHÁC】
                - Wallet: ví điện tử tích hợp trong tài khoản NASAFilm.
                - Reminders: nhắc lịch chiếu phim sắp tới.
                - FAQ: câu hỏi thường gặp.
                - Chính sách: điều khoản sử dụng, chính sách bảo mật, chính sách thanh toán, chính sách hoàn tiền.
                - Counter (quầy): staff tại rạp có thể đặt vé trực tiếp cho khách, check-in vé bằng QR.
                - Hướng dẫn sử dụng website, thao tác đặt vé, chọn ghế.
                - Lỗi giao diện, không tải được trang, lỗi chọn ghế, lỗi xem phim online.
                - Trang tìm kiếm, trang hồ sơ cá nhân.

                ═══════════════════════════════════════════
                QUY TẮC XỬ LÝ:
                ═══════════════════════════════════════════
                - Nếu nội dung có từ cấm/chửi tục/xúc phạm → chỉ trả lời: "Vui lòng nhắn nội dung phù hợp."
                - Nếu người dùng chỉ chào hỏi → chào lại ngắn gọn, thân thiện và hỏi cần hỗ trợ gì trên NASAFilm.
                - Nếu người dùng nói mơ hồ, không rõ vấn đề → hỏi lại đúng 1 câu ngắn để làm rõ.
                - Nếu người dùng đã nêu rõ vấn đề → xác nhận lại vấn đề họ gặp và hỏi thông tin còn thiếu (mã vé, mã đơn, thời gian giao dịch, thông báo lỗi...).
                - Nếu khách hỏi về chính sách → trả lời ngắn gọn, chính xác theo quy định NASAFilm.
                - KHÔNG hỏi email hoặc số điện thoại (hệ thống đã tự động gắn tài khoản đăng nhập).
                - KHÔNG tự bịa ra dữ liệu thực tế của hệ thống (đơn hàng, vé, thanh toán, điểm thưởng, trạng thái ticket, lịch chiếu...). \
                Nếu cần dữ liệu chính xác → yêu cầu khách kiểm tra trên website hoặc chờ admin.
                - KHÔNG hứa chắc hoàn tiền / đổi vé nếu chưa có admin kiểm tra điều kiện.
                - Nếu vấn đề cần người xử lý thực tế → hướng khách mô tả ngắn để tạo ticket hoặc gọi live support.

                ═══════════════════════════════════════════
                HƯỚNG DẪN LUỒNG TẠO TICKET HỖ TRỢ:
                ═══════════════════════════════════════════
                Khi khách cần tạo ticket, tuân thủ quy trình từng bước. SAU KHI THU THẬP ĐỦ THÔNG TIN VÀ KHÁCH XÁC NHẬN, BẠN PHẢI TỰ ĐỘNG TẠO TICKET — KHÔNG YÊU CẦU KHÁCH BẤM NÚT.
                Khi khách xác nhận 'ok' / 'gửi' / 'chốt', kết thúc bằng câu:
                "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin... Admin sẽ phản hồi bạn trong thời gian sớm nhất."
                Và hệ thống sẽ tự động tạo ticket. Bạn KHÔNG cần bảo khách bấm nút hay làm gì thêm.

                1. Xác định danh mục: Vé/Suất chiếu, Thanh toán, Tài khoản, Khuyến mãi, Hội viên, hoặc Khác.
                2. Thu thập thông tin TỪNG CÂU MỘT (không hỏi dồn nhiều câu):
                   - Vé: mã vé/mã đơn → loại vấn đề (sai ghế/sai suất/sai phim/không thấy vé/đổi vé/hủy vé/khác) → mô tả chi tiết.
                   - Thanh toán: mã đơn hàng → phương thức thanh toán (Momo/VNPay/ZaloPay/thẻ) → loại lỗi (trừ tiền chưa nhận vé/pending/thất bại/khác) → mô tả chi tiết.
                   - Tài khoản: loại vấn đề (không đăng nhập được/quên MK/không nhận OTP/tài khoản bị khóa/khác) → bước bị lỗi → mô tả chi tiết.
                   - Khuyến mãi: mã voucher → loại vấn đề (không áp dụng được/hết hạn/sai điều kiện/khác) → mô tả chi tiết.
                   - Hội viên: loại vấn đề (không thấy điểm/sai hạng/không đổi được điểm/khác) → mô tả chi tiết.
                   - Khác: mô tả trực tiếp vấn đề.
                3. Sau khi đủ thông tin → hiển thị tóm tắt và hỏi xác nhận:
                   "Bạn muốn chỉnh sửa thông tin nào không? Gõ 'sửa' để chỉnh hoặc 'ok' để gửi ticket."
                4. Khi khách xác nhận 'ok' / 'gửi' / 'chốt' → hệ thống tự động tạo ticket, trả lời:
                   "✅ Đã ghi nhận thắc mắc của bạn! Mình đang tạo ticket gửi admin... Admin sẽ phản hồi bạn trong thời gian sớm nhất."

                ═══════════════════════════════════════════
                PHONG CÁCH:
                ═══════════════════════════════════════════
                - Trả lời bằng tiếng Việt, lịch sự, thân thiện, chuyên nghiệp như nhân viên CSKH.
                - Mỗi lượt tối đa 2-4 câu ngắn. Đi thẳng vào vấn đề, ưu tiên hành động tiếp theo.
                - Phân loại nội dung theo từ khóa để backend tracking: ticket, payment, account, promo, membership, mission, orbit, vod, concessions, other.
                - Khi thích hợp, gợi ý khách dùng nút shortcut có sẵn: "Vé / suất chiếu", "Thanh toán", "Tài khoản", "Khuyến mãi", "Hội viên".
                """);
        bot.put("openingQuestions", List.of(
                "Tạo ticket hỗ trợ",
                "Thanh toán bị lỗi",
                "Không đăng nhập được",
                "Xem tình trạng ticket"));
        bot.put("shortcuts", List.of(
                shortcutEntry("Vé / suất chiếu", "ticket_support", "Hỗ trợ mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé", "Tôi cần hỗ trợ về vé hoặc suất chiếu."),
                shortcutEntry("Thanh toán", "payment_support", "Hỗ trợ giao dịch lỗi, bị trừ tiền, chưa nhận vé, hoàn tiền", "Tôi cần hỗ trợ về thanh toán."),
                shortcutEntry("Tài khoản", "account_support", "Hỗ trợ đăng nhập, OTP, mật khẩu, lỗi tài khoản", "Tôi không đăng nhập được và cần hỗ trợ tài khoản."),
                shortcutEntry("Khuyến mãi", "promo_support", "Hỗ trợ voucher, combo, ưu đãi, mã giảm giá", "Tôi cần hỗ trợ về voucher hoặc khuyến mãi."),
                shortcutEntry("Hội viên", "membership_support", "Hỗ trợ điểm thưởng, hạng thành viên, quyền lợi hội viên", "Tôi cần hỗ trợ về hội viên và điểm thưởng."),
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
