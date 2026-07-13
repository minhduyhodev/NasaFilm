package com.thdpv.movietheater.support.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.ComboResponse;
import com.thdpv.movietheater.booking.dto.response.ShowtimeResponse;
import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.booking.service.ComboService;
import com.thdpv.movietheater.booking.service.ShowtimeService;
import com.thdpv.movietheater.booking.util.MemberTierUtils;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.service.MovieService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

/**
 * Builds a compact live-data snapshot for NASA BOT Giải đáp AI prompts.
 */
@Service
public class SupportAiContextService {

    private static final Logger log = LoggerFactory.getLogger(SupportAiContextService.class);
    private static final int MOVIE_LIMIT = 12;
    private static final int SHOWTIME_LIMIT = 20;
    private static final int SHOWTIME_HOURS = 24;
    private static final int COMBO_LIMIT = 10;
    private static final int VOUCHER_LIMIT = 10;
    private static final long CACHE_TTL_MS = 60_000L;

    private static final DateTimeFormatter SHOWTIME_FMT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM", Locale.forLanguageTag("vi-VN"));
    private static final NumberFormat MONEY_FMT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));

    private final MovieService movieService;
    private final ShowtimeService showtimeService;
    private final SystemConfigService systemConfigService;
    private final ComboService comboService;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;

    private final AtomicReference<CachedContext> cache = new AtomicReference<>();

    public SupportAiContextService(
            MovieService movieService,
            ShowtimeService showtimeService,
            SystemConfigService systemConfigService,
            ComboService comboService,
            PromotionRepository promotionRepository,
            UserRepository userRepository) {
        this.movieService = movieService;
        this.showtimeService = showtimeService;
        this.systemConfigService = systemConfigService;
        this.comboService = comboService;
        this.promotionRepository = promotionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public String buildLiveContextBlock(String userEmail) {
        String shared = buildSharedCatalogContext();
        String userBlock = buildUserContextBlock(userEmail);
        if (userBlock == null || userBlock.isBlank()) {
            return shared;
        }
        return shared + "\n\n" + userBlock;
    }

    private String buildSharedCatalogContext() {
        long now = System.currentTimeMillis();
        CachedContext cached = cache.get();
        if (cached != null && now - cached.createdAtMs() < CACHE_TTL_MS) {
            return cached.text();
        }

        try {
            String text = renderSharedContext();
            cache.set(new CachedContext(text, now));
            return text;
        } catch (Exception ex) {
            log.warn("Failed to build Support AI live context: {}", ex.getMessage());
            return """
                    DỮ LIỆU THỰC TẾ (tạm thiếu):
                    - Không tải được snapshot lúc này. Không bịa phim/suất/giá/voucher.
                    - Bảo khách xem trang Phim / Lịch chiếu / Offers hoặc chuyển Hỗ trợ nếu cần xử lý cá nhân.
                    """;
        }
    }

    private String renderSharedContext() {
        StringBuilder sb = new StringBuilder();
        sb.append("DỮ LIỆU THỰC TẾ (snapshot hệ thống — ưu tiên dùng khi trả lời; không bịa ngoài danh sách):\n");
        sb.append("- Cập nhật lúc: ").append(OffsetDateTime.now().format(SHOWTIME_FMT)).append('\n');

        appendPolicies(sb);
        appendMovies(sb);
        appendShowtimes(sb);
        appendCombos(sb);
        appendVouchers(sb);

        sb.append("""
                QUY TẮC DỮ LIỆU:
                - Chỉ nêu phim/suất/combo/voucher có trong snapshot trên. Ngoài snapshot → bảo khách mở trang tương ứng.
                - Không bịa mã đơn, ghế trống realtime, giá ngoài snapshot.
                - Nếu có khối KHÁCH ĐANG ĐĂNG NHẬP → được dùng điểm/hạng đó; không bịa điểm cho khách khác.
                - Câu hỏi về đơn hàng/vé cụ thể → hướng sang mục Hỗ trợ.
                """);
        return sb.toString().trim();
    }

    private String buildUserContextBlock(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return "KHÁCH ĐANG ĐĂNG NHẬP: chưa xác định (guest). Không nêu điểm/hạng cá nhân.";
        }
        try {
            return userRepository.findByEmailIgnoreCase(userEmail.trim())
                    .map(this::formatUserBlock)
                    .orElse("KHÁCH ĐANG ĐĂNG NHẬP: không tìm thấy hồ sơ. Không bịa điểm/hạng.");
        } catch (Exception ex) {
            log.warn("Failed to load user context for Support AI: {}", ex.getMessage());
            return "KHÁCH ĐANG ĐĂNG NHẬP: tạm không tải được hồ sơ.";
        }
    }

    private String formatUserBlock(User user) {
        int score = user.getScore() != null ? user.getScore() : 0;
        int lifetime = user.getLifetimeScore() != null ? user.getLifetimeScore() : 0;
        String tier = MemberTierUtils.resolveTierLabel(lifetime);
        StringBuilder sb = new StringBuilder();
        sb.append("KHÁCH ĐANG ĐĂNG NHẬP (dùng khi hỏi điểm/hạng/quyền lợi cá nhân):\n");
        sb.append("- Tên: ").append(safe(user.getFullName())).append('\n');
        sb.append("- Email: ").append(safe(user.getEmail())).append('\n');
        sb.append("- Điểm hiện có (score): ").append(score).append('\n');
        sb.append("- Lifetime score: ").append(lifetime).append('\n');
        sb.append("- Hạng: ").append(tier).append('\n');
        if (lifetime >= MemberTierUtils.TIER_VIP_MIN_SCORE) {
            sb.append("- Quyền lợi combo: giảm 15% (VIP).\n");
        } else if (lifetime >= MemberTierUtils.TIER_FRIEND_MIN_SCORE) {
            sb.append("- Quyền lợi combo: giảm 10% (Friend).\n");
        } else {
            sb.append("- Quyền lợi combo: chưa có giảm hạng (Member).\n");
        }
        return sb.toString().trim();
    }

    private void appendPolicies(StringBuilder sb) {
        int pointsRatio = readPointsEarningRatio();
        sb.append("\nCHÍNH SÁCH HIỆN HÀNH (từ system config):\n");
        sb.append("- Giữ ghế: ").append(systemConfigService.getSeatLockMinutes()).append(" phút.\n");
        sb.append("- Tối đa ghế/lần đặt: ").append(systemConfigService.getMaxSeatsPerBooking()).append(".\n");
        sb.append("- Hủy/đổi vé: trước giờ chiếu ")
                .append(systemConfigService.getCancellationCutoffMinutes())
                .append(" phút, phí ")
                .append(systemConfigService.getCancellationFeePercent())
                .append("%.\n");
        sb.append("- Khách tự yêu cầu hoàn: ")
                .append(systemConfigService.isCustomerRefundEnabled() ? "bật" : "tắt")
                .append("; rạp hủy suất → hoàn 100%: ")
                .append(systemConfigService.isFullRefundOnShowtimeCancel() ? "có" : "không")
                .append("; duyệt hoàn thủ công: ")
                .append(systemConfigService.isRefundManualApprovalRequired() ? "có" : "không")
                .append(".\n");
        sb.append("- Điểm: ~").append(pointsRatio)
                .append("% giá trị đơn (floor theo cấu hình); 1 điểm = ")
                .append(formatMoney(BigDecimal.valueOf(systemConfigService.getPointsToCashValue())))
                .append(".\n");
        sb.append("- Hội viên (lifetimeScore): NASA Member (0), NASA Friend (≥")
                .append(MemberTierUtils.TIER_FRIEND_MIN_SCORE)
                .append("), NASA VIP (≥")
                .append(MemberTierUtils.TIER_VIP_MIN_SCORE)
                .append("). Combo Friend -10%, VIP -15%.\n");
        sb.append("- Thanh toán phổ biến: MoMo, VNPay, ZaloPay, thẻ, ví NASA, quầy.\n");
    }

    private void appendMovies(StringBuilder sb) {
        sb.append("\nPHIM ĐANG CHIẾU (có suất đặt được):\n");
        MovieFilterRequest filter = new MovieFilterRequest();
        filter.setRequireBookableShowtime(true);
        List<MovieListResponse> movies = movieService
                .getMovieList(filter, PageRequest.of(0, MOVIE_LIMIT))
                .getContent();
        if (movies.isEmpty()) {
            sb.append("- (Chưa có phim đang chiếu trong hệ thống)\n");
            return;
        }
        int i = 1;
        for (MovieListResponse movie : movies) {
            sb.append(i++).append(". ").append(safe(movie.getTitle()));
            if (movie.getAgeRestriction() != null && !movie.getAgeRestriction().isBlank()) {
                sb.append(" · ").append(movie.getAgeRestriction().trim());
            }
            if (movie.getDurationMinutes() != null) {
                sb.append(" · ").append(movie.getDurationMinutes()).append(" phút");
            }
            if (movie.getNextShowtimeStart() != null) {
                sb.append(" · suất gần: ").append(movie.getNextShowtimeStart().format(SHOWTIME_FMT));
            }
            sb.append('\n');
        }
    }

    private void appendShowtimes(StringBuilder sb) {
        sb.append("\nSUẤT CHIẾU GẦN NHẤT (")
                .append(SHOWTIME_HOURS)
                .append(" giờ tới, tối đa ")
                .append(SHOWTIME_LIMIT)
                .append("):\n");
        List<ShowtimeResponse> showtimes = showtimeService.getUpcomingShowtimesWithinHours(
                SHOWTIME_HOURS, SHOWTIME_LIMIT);
        if (showtimes.isEmpty()) {
            sb.append("- (Chưa có suất mở bán trong cửa sổ thời gian này)\n");
            return;
        }
        int i = 1;
        for (ShowtimeResponse st : showtimes) {
            sb.append(i++).append(". ")
                    .append(st.getStartTime() != null ? st.getStartTime().format(SHOWTIME_FMT) : "?")
                    .append(" · ").append(safe(st.getMovieTitle()))
                    .append(" · ").append(safe(st.getCinemaName()))
                    .append(" · ").append(safe(st.getCinemaRoomName()));
            if (st.getBasePrice() != null) {
                sb.append(" · từ ").append(formatMoney(st.getBasePrice()));
            }
            if (st.getStatus() != null) {
                sb.append(" · ").append(st.getStatus().name());
            }
            sb.append('\n');
        }
    }

    private void appendCombos(StringBuilder sb) {
        sb.append("\nCOMBO BẮP NƯỚC ĐANG BÁN:\n");
        List<ComboResponse> combos = comboService.getActiveComboResponses();
        if (combos.isEmpty()) {
            sb.append("- (Chưa có combo ACTIVE)\n");
            return;
        }
        int i = 1;
        for (ComboResponse combo : combos) {
            if (i > COMBO_LIMIT) {
                sb.append("- … và ").append(combos.size() - COMBO_LIMIT).append(" combo khác.\n");
                break;
            }
            sb.append(i++).append(". ").append(safe(combo.getName()));
            if (combo.getPrice() != null) {
                sb.append(" · ").append(formatMoney(combo.getPrice()));
            }
            String desc = combo.getDescription();
            if (desc != null && !desc.isBlank()) {
                String shortDesc = desc.trim().replaceAll("\\s+", " ");
                if (shortDesc.length() > 60) {
                    shortDesc = shortDesc.substring(0, 60) + "…";
                }
                sb.append(" · ").append(shortDesc);
            }
            sb.append('\n');
        }
    }

    private void appendVouchers(StringBuilder sb) {
        sb.append("\nVOUCHER / KHUYẾN MÃI ĐANG HIỆU LỰ:\n");
        List<Promotion> promotions = promotionRepository.findEligiblePromotions(OffsetDateTime.now());
        if (promotions.isEmpty()) {
            sb.append("- (Chưa có voucher ACTIVE trong thời gian hiện tại)\n");
            return;
        }
        int i = 1;
        for (Promotion promo : promotions) {
            if (i > VOUCHER_LIMIT) {
                sb.append("- … và ").append(promotions.size() - VOUCHER_LIMIT).append(" mã khác.\n");
                break;
            }
            sb.append(i++).append(". ").append(safe(promo.getCode()));
            sb.append(" · ").append(formatDiscount(promo));
            if (promo.getMinScore() != null && promo.getMinScore() > 0) {
                sb.append(" · yêu cầu hạng: ").append(MemberTierUtils.resolveRequiredTierLabel(promo.getMinScore()));
            }
            if (promo.getPointsCost() != null && promo.getPointsCost() > 0) {
                sb.append(" · đổi bằng ").append(promo.getPointsCost()).append(" điểm");
            }
            if (promo.getEndDate() != null) {
                sb.append(" · hết hạn ").append(promo.getEndDate().format(SHOWTIME_FMT));
            }
            sb.append('\n');
        }
    }

    private String formatDiscount(Promotion promo) {
        String type = promo.getDiscountType() == null ? "" : promo.getDiscountType().trim().toUpperCase();
        BigDecimal value = promo.getDiscountValue();
        if (value == null) {
            return "giảm —";
        }
        if (type.contains("PERCENT") || type.equals("%") || type.equals("PERCENTAGE")) {
            return "giảm " + MONEY_FMT.format(value) + "%";
        }
        return "giảm " + formatMoney(value);
    }

    private int readPointsEarningRatio() {
        try {
            Object value = systemConfigService.getConfig().get("pointsEarningRatio");
            if (value instanceof Number number) {
                return Math.max(1, number.intValue());
            }
            if (value != null) {
                return Math.max(1, Integer.parseInt(value.toString().trim()));
            }
        } catch (Exception ignored) {
            // fallback
        }
        return 5;
    }

    private static String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "—";
        }
        return MONEY_FMT.format(amount) + "đ";
    }

    private static String safe(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim();
    }

    private record CachedContext(String text, long createdAtMs) {}
}
