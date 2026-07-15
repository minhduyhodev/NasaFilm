package com.thdpv.movietheater.support.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

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
import com.thdpv.movietheater.cinema.dto.response.CinemaResponse;
import com.thdpv.movietheater.cinema.enums.CinemaStatus;
import com.thdpv.movietheater.cinema.service.CinemaService;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;
import com.thdpv.movietheater.mission.repository.MissionCampaignRepository;
import com.thdpv.movietheater.mission.repository.MissionTemplateRepository;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.service.MovieService;
import com.thdpv.movietheater.movie.service.ReviewVibeTagService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

/**
 * Builds a compact live-data snapshot of NASAFilm public catalog for NASA BOT Giải đáp AI.
 */
@Service
public class SupportAiContextService {

    private static final Logger log = LoggerFactory.getLogger(SupportAiContextService.class);
    private static final int MOVIE_LIMIT = 12;
    private static final int COMING_SOON_LIMIT = 10;
    private static final int VOD_LIMIT = 10;
    private static final int SHOWTIME_LIMIT = 30;
    private static final int SHOWTIME_HOURS = 168;
    private static final int CINEMA_LIMIT = 15;
    private static final int COMBO_LIMIT = 10;
    private static final int VOUCHER_LIMIT = 10;
    private static final int MISSION_LIMIT = 12;
    private static final int CAMPAIGN_LIMIT = 5;
    private static final long CACHE_TTL_MS = 60_000L;

    private static final DateTimeFormatter SHOWTIME_FMT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM", Locale.forLanguageTag("vi-VN"));
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.forLanguageTag("vi-VN"));
    private static final NumberFormat MONEY_FMT = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));

    private final MovieService movieService;
    private final ShowtimeService showtimeService;
    private final SystemConfigService systemConfigService;
    private final ComboService comboService;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final CinemaService cinemaService;
    private final MissionTemplateRepository missionTemplateRepository;
    private final MissionCampaignRepository missionCampaignRepository;
    private final ReviewVibeTagService reviewVibeTagService;

    private final AtomicReference<CachedContext> cache = new AtomicReference<>();

    public SupportAiContextService(
            MovieService movieService,
            ShowtimeService showtimeService,
            SystemConfigService systemConfigService,
            ComboService comboService,
            PromotionRepository promotionRepository,
            UserRepository userRepository,
            CinemaService cinemaService,
            MissionTemplateRepository missionTemplateRepository,
            MissionCampaignRepository missionCampaignRepository,
            ReviewVibeTagService reviewVibeTagService) {
        this.movieService = movieService;
        this.showtimeService = showtimeService;
        this.systemConfigService = systemConfigService;
        this.comboService = comboService;
        this.promotionRepository = promotionRepository;
        this.userRepository = userRepository;
        this.cinemaService = cinemaService;
        this.missionTemplateRepository = missionTemplateRepository;
        this.missionCampaignRepository = missionCampaignRepository;
        this.reviewVibeTagService = reviewVibeTagService;
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
                    - Không tải được snapshot website lúc này. Không bịa thông tin.
                    - Bảo khách xem trang Phim / Lịch chiếu / Offers / Missions hoặc chuyển Hỗ trợ.
                    """;
        }
    }

    private String renderSharedContext() {
        StringBuilder sb = new StringBuilder();
        sb.append("DỮ LIỆU THỰC TẾ WEBSITE NASAFILM (snapshot — chỉ trả lời dựa trên khối này + persona):\n");
        sb.append("- Cập nhật lúc: ").append(OffsetDateTime.now().format(SHOWTIME_FMT)).append('\n');

        appendSiteMap(sb);
        appendPolicies(sb);
        appendRoomFormats(sb);
        appendCinemas(sb);
        appendNowShowing(sb);
        appendComingSoon(sb);
        appendVodMovies(sb);
        appendShowtimes(sb);
        appendCombos(sb);
        appendVouchers(sb);
        appendMissions(sb);
        appendCatalogMeta(sb);

        sb.append("""
                QUY TẮC DỮ LIỆU:
                - Chỉ nêu phim/suất/rạp/combo/voucher/mission có trong snapshot. Ngoài snapshot → bảo khách mở trang tương ứng trên web.
                - Không bịa mã đơn, ghế trống realtime, giá ngoài snapshot.
                - Nếu có khối KHÁCH ĐANG ĐĂNG NHẬP → được dùng điểm/hạng đó; không bịa điểm cho khách khác.
                - Câu hỏi về đơn hàng/vé cụ thể → hướng sang mục Hỗ trợ.
                """);
        return sb.toString().trim();
    }

    private void appendSiteMap(StringBuilder sb) {
        sb.append("\nSƠ ĐỒ TÍNH NĂNG WEB (điều hướng khách):\n");
        sb.append("- Trang chủ / Phim đang chiếu / Sắp chiếu / Xem online (VOD).\n");
        sb.append("- Chi tiết phim → chọn suất → ghế → combo → thanh toán → QR vé.\n");
        sb.append("- Offers (voucher/điểm), Missions, Orbit Rooms (đặt nhóm), Ví NASA, Profile, FAQ widget NASA BOT.\n");
        sb.append("- Hỗ trợ: tạo ticket / chat staff qua NASA BOT (tab Hỗ trợ / Nhắn staff).\n");
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
        sb.append("\nCHÍNH SÁCH HIỆN HÀNH (system config):\n");
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
                .append("% giá trị đơn; 1 điểm = ")
                .append(formatMoney(BigDecimal.valueOf(systemConfigService.getPointsToCashValue())))
                .append(".\n");
        sb.append("- Hội viên (lifetimeScore): NASA Member (0), NASA Friend (≥")
                .append(MemberTierUtils.TIER_FRIEND_MIN_SCORE)
                .append("), NASA VIP (≥")
                .append(MemberTierUtils.TIER_VIP_MIN_SCORE)
                .append("). Combo Friend -10%, VIP -15%.\n");
        sb.append("- Giá VOD mặc định: ").append(formatMoney(systemConfigService.getDefaultOnlinePrice())).append(".\n");
        sb.append("- Đồng hồ đếm ngược VOD: ")
                .append(systemConfigService.isOnlineCountdownEnabled() ? "bật" : "tắt")
                .append("; hệ số giữ ghế online ×")
                .append(systemConfigService.getOnlineWatchLockMultiplier())
                .append("; cảnh báo còn ")
                .append(systemConfigService.getOnlineCountdownWarningMinutes())
                .append(" phút.\n");
        sb.append("- Orbit Room TTL: ").append(systemConfigService.getOrbitRoomTtlMinutes())
                .append(" phút; checkout TTL: ").append(systemConfigService.getOrbitCheckoutTtlMinutes())
                .append(" phút.\n");
        sb.append("- Thanh toán: MoMo, VNPay, ZaloPay, thẻ, ví NASA, quầy.\n");
    }

    private void appendRoomFormats(StringBuilder sb) {
        sb.append("\nLOẠI PHÒNG / ĐỊNH DẠNG CHIẾU:\n");
        sb.append("- Room types: ").append(joinConfigLabels(systemConfigService.getRoomTypes())).append('\n');
        sb.append("- Screening formats: ").append(joinConfigLabels(systemConfigService.getScreeningFormats())).append('\n');
    }

    private void appendCinemas(StringBuilder sb) {
        sb.append("\nRẠP ĐANG HOẠT ĐỘNG:\n");
        List<CinemaResponse> cinemas = cinemaService.getCinemas(null, 0, CINEMA_LIMIT).getContent().stream()
                .filter(c -> c.getStatus() == null || c.getStatus() == CinemaStatus.ACTIVE)
                .toList();
        if (cinemas.isEmpty()) {
            sb.append("- (Chưa có rạp ACTIVE)\n");
            return;
        }
        int i = 1;
        for (CinemaResponse cinema : cinemas) {
            sb.append(i++).append(". ").append(safe(cinema.getName()));
            if (cinema.getAddress() != null && !cinema.getAddress().isBlank()) {
                sb.append(" · ").append(clip(cinema.getAddress(), 70));
            }
            if (cinema.getPhoneNumber() != null && !cinema.getPhoneNumber().isBlank()) {
                sb.append(" · ").append(cinema.getPhoneNumber().trim());
            }
            if (cinema.getTotalRooms() > 0) {
                sb.append(" · ").append(cinema.getTotalRooms()).append(" phòng");
            }
            sb.append('\n');
        }
    }

    private void appendNowShowing(StringBuilder sb) {
        sb.append("\nPHIM ĐANG CHIẾU (có suất đặt được):\n");
        MovieFilterRequest filter = new MovieFilterRequest();
        filter.setRequireBookableShowtime(true);
        appendMovieLines(sb, movieService.getMovieList(filter, PageRequest.of(0, MOVIE_LIMIT)).getContent(), false);
    }

    private void appendComingSoon(StringBuilder sb) {
        sb.append("\nPHIM SẮP CHIẾU:\n");
        List<MovieListResponse> movies = movieService
                .getUpcomingMovieList(PageRequest.of(0, COMING_SOON_LIMIT))
                .getContent();
        if (movies.isEmpty()) {
            sb.append("- (Chưa có phim sắp chiếu)\n");
            return;
        }
        int i = 1;
        for (MovieListResponse movie : movies) {
            sb.append(i++).append(". ").append(safe(movie.getTitle()));
            if (movie.getReleaseDate() != null) {
                sb.append(" · dự kiến ").append(movie.getReleaseDate().format(DATE_FMT));
            }
            appendMovieMeta(sb, movie);
            sb.append('\n');
        }
    }

    private void appendVodMovies(StringBuilder sb) {
        sb.append("\nPHIM XEM ONLINE (VOD):\n");
        MovieFilterRequest filter = new MovieFilterRequest();
        filter.setOnlineOnly(true);
        List<MovieListResponse> movies = movieService
                .getMovieList(filter, PageRequest.of(0, VOD_LIMIT))
                .getContent();
        if (movies.isEmpty()) {
            sb.append("- (Chưa có phim VOD)\n");
            return;
        }
        int i = 1;
        for (MovieListResponse movie : movies) {
            sb.append(i++).append(". ").append(safe(movie.getTitle()));
            appendMovieMeta(sb, movie);
            if (movie.getOnlinePrice() != null) {
                sb.append(" · ").append(formatMoney(movie.getOnlinePrice()));
            }
            if (movie.getScreeningMode() != null && !movie.getScreeningMode().isBlank()) {
                sb.append(" · ").append(movie.getScreeningMode().trim());
            }
            sb.append('\n');
        }
    }

    private void appendShowtimes(StringBuilder sb) {
        sb.append("\nSUẤT CHIẾU SẮP TỚI (trong ")
                .append(SHOWTIME_HOURS / 24)
                .append(" ngày tới, tối đa ")
                .append(SHOWTIME_LIMIT)
                .append(" suất):\n");
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
            if (combo.getDescription() != null && !combo.getDescription().isBlank()) {
                sb.append(" · ").append(clip(combo.getDescription(), 60));
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

    private void appendMissions(StringBuilder sb) {
        sb.append("\nMISSION / CHIẾN DỊCH ĐANG MỞ:\n");
        List<MissionCampaign> campaigns = missionCampaignRepository
                .findByStatusOrderBySortOrderAscTitleAsc(MissionCampaignStatus.ACTIVE);
        if (!campaigns.isEmpty()) {
            int i = 1;
            for (MissionCampaign campaign : campaigns) {
                if (i > CAMPAIGN_LIMIT) {
                    sb.append("- … và ").append(campaigns.size() - CAMPAIGN_LIMIT).append(" campaign khác.\n");
                    break;
                }
                sb.append("Campaign ").append(i++).append(". ")
                        .append(safe(campaign.getCode())).append(" · ").append(safe(campaign.getTitle()));
                if (campaign.getEndsAt() != null) {
                    sb.append(" · đến ").append(campaign.getEndsAt().format(SHOWTIME_FMT));
                }
                sb.append('\n');
            }
        }

        List<MissionTemplate> templates = missionTemplateRepository
                .findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc();
        if (templates.isEmpty() && campaigns.isEmpty()) {
            sb.append("- (Chưa có mission ACTIVE)\n");
            return;
        }
        int i = 1;
        for (MissionTemplate mission : templates) {
            if (i > MISSION_LIMIT) {
                sb.append("- … và ").append(templates.size() - MISSION_LIMIT).append(" mission khác.\n");
                break;
            }
            sb.append(i++).append(". ").append(safe(mission.getCode()))
                    .append(" · ").append(safe(mission.getTitle()))
                    .append(" · +").append(mission.getRewardPoints()).append(" điểm");
            if (mission.getRecurrence() != null) {
                sb.append(" · ").append(mission.getRecurrence().name());
            }
            if (mission.getDescription() != null && !mission.getDescription().isBlank()) {
                sb.append(" · ").append(clip(mission.getDescription(), 50));
            }
            sb.append('\n');
        }
    }

    private void appendCatalogMeta(StringBuilder sb) {
        sb.append("\nDANH MỤC PHỤ:\n");
        String genres = movieService.getAllGenres().stream()
                .map(Genre::getName)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.joining(", "));
        String countries = movieService.getAllCountries().stream()
                .map(Country::getName)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.joining(", "));
        String vibes = reviewVibeTagService.listActivePublic().stream()
                .map(tag -> safe(tag.getLabel()) + " (" + safe(tag.getCode()) + ")")
                .collect(Collectors.joining(", "));
        sb.append("- Thể loại: ").append(genres.isBlank() ? "(trống)" : genres).append('\n');
        sb.append("- Quốc gia: ").append(countries.isBlank() ? "(trống)" : countries).append('\n');
        sb.append("- Vibe tags review: ").append(vibes.isBlank() ? "(trống)" : vibes).append('\n');
    }

    private void appendMovieLines(StringBuilder sb, List<MovieListResponse> movies, boolean includePrice) {
        if (movies.isEmpty()) {
            sb.append("- (Trống)\n");
            return;
        }
        int i = 1;
        for (MovieListResponse movie : movies) {
            sb.append(i++).append(". ").append(safe(movie.getTitle()));
            appendMovieMeta(sb, movie);
            if (includePrice && movie.getOnlinePrice() != null) {
                sb.append(" · ").append(formatMoney(movie.getOnlinePrice()));
            }
            if (movie.getNextShowtimeStart() != null) {
                sb.append(" · suất gần: ").append(movie.getNextShowtimeStart().format(SHOWTIME_FMT));
            }
            sb.append('\n');
        }
    }

    private void appendMovieMeta(StringBuilder sb, MovieListResponse movie) {
        if (movie.getAgeRestriction() != null && !movie.getAgeRestriction().isBlank()) {
            sb.append(" · ").append(movie.getAgeRestriction().trim());
        }
        if (movie.getDurationMinutes() != null) {
            sb.append(" · ").append(movie.getDurationMinutes()).append(" phút");
        }
    }

    private String joinConfigLabels(List<Map<String, Object>> items) {
        if (items == null || items.isEmpty()) {
            return "(trống)";
        }
        return items.stream()
                .filter(item -> {
                    Object enabled = item.get("enabled");
                    return enabled == null || Boolean.TRUE.equals(enabled) || "true".equalsIgnoreCase(String.valueOf(enabled));
                })
                .map(item -> {
                    Object label = item.get("label");
                    Object value = item.get("value");
                    if (label != null && !String.valueOf(label).isBlank()) {
                        return String.valueOf(label).trim();
                    }
                    return value == null ? null : String.valueOf(value).trim();
                })
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(", "));
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

    private static String clip(String value, int max) {
        String text = value.trim().replaceAll("\\s+", " ");
        if (text.length() <= max) {
            return text;
        }
        return text.substring(0, max) + "…";
    }

    private static String safe(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim();
    }

    private record CachedContext(String text, long createdAtMs) {}
}
