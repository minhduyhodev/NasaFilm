package com.thdpv.movietheater.booking.controller;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.MyVoucherResponse;
import com.thdpv.movietheater.booking.dto.response.PromotionValidateResponse;
import com.thdpv.movietheater.booking.dto.response.PublicPromotionResponse;
import com.thdpv.movietheater.booking.dto.response.VoucherCatalogResponse;
import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.entity.UserVoucher;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.booking.repository.UserVoucherRepository;
import com.thdpv.movietheater.booking.service.PromotionLifecycleService;
import com.thdpv.movietheater.booking.service.VoucherRedemptionService;
import com.thdpv.movietheater.booking.util.MemberTierUtils;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionRepository promotionRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final PromotionLifecycleService promotionLifecycleService;
    private final VoucherRedemptionService voucherRedemptionService;

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<PromotionValidateResponse>> validatePromotion(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("code") String code) {

        String trimmedCode = code != null ? code.trim().toUpperCase() : "";
        if (trimmedCode.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, "", "", null, "", "Mã khuyến mãi không được trống")));
        }

        Optional<Promotion> promoOpt = promotionRepository.findActiveByCodeIgnoreCase(trimmedCode);
        if (promoOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, trimmedCode, "", null, "", "Mã khuyến mãi không tồn tại")));
        }

        Promotion promotion = promoOpt.get();
        OffsetDateTime now = OffsetDateTime.now();
        Optional<String> availabilityError = resolveAvailabilityError(promotion, now);
        if (availabilityError.isPresent()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", availabilityError.get())));
        }

        UUID userUuid = resolveUserUuid(userDetails);
        Optional<String> userError = resolveUserUsageError(promotion, userUuid);
        if (userError.isPresent()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", userError.get())));
        }

        if (promotion.requiresPointRedemption()) {
            if (userUuid == null) {
                return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                        false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                        "", "Bạn cần đăng nhập và đổi điểm để kích hoạt voucher này")));
            }
            long activeWallet = userVoucherRepository.countByUserUuidAndPromotionUuidAndStatus(
                    userUuid, promotion.getId(), VoucherRedemptionService.USER_VOUCHER_ACTIVE);
            if (activeWallet <= 0) {
                return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                        false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                        "", "Bạn chưa kích hoạt voucher này bằng điểm thưởng")));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                true, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                buildDescription(promotion), null)));
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<PublicPromotionResponse>>> getPublicPromotions() {
        OffsetDateTime now = OffsetDateTime.now();
        List<PublicPromotionResponse> responses = new ArrayList<>();

        for (Promotion promotion : promotionRepository.findEligiblePromotions(now)) {
            if (promotionLifecycleService.isUsageExhausted(promotion)) {
                continue;
            }

            PublicPromotionResponse item = new PublicPromotionResponse();
            item.setId(promotion.getId());
            item.setCode(promotion.getCode());
            item.setDiscountType(promotion.getDiscountType());
            item.setDiscountValue(promotion.getDiscountValue());
            item.setDescription(buildDescription(promotion));
            item.setEndDate(promotion.getEndDate());
            item.setOncePerUser(Boolean.TRUE.equals(promotion.getOncePerUser()));
            item.setRequiresRedemption(promotion.requiresPointRedemption());
            item.setPointsCost(promotion.getPointsCost() != null ? promotion.getPointsCost() : 0);
            item.setBadge(buildBadge(promotion));
            item.setTitle(buildPublicTitle(promotion));
            item.setCategory(buildPublicCategory(promotion));
            item.setDetails(buildPublicDetails(promotion));
            responses.add(item);
        }

        responses.sort((a, b) -> a.getCode().compareToIgnoreCase(b.getCode()));
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/catalog")
    public ResponseEntity<ApiResponse<List<VoucherCatalogResponse>>> getVoucherCatalog(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userUuid = resolveUserUuid(userDetails);
        User user = userUuid != null
                ? userRepository.findById(userUuid).orElse(null)
                : null;
        int lifetimeScore = user != null && user.getLifetimeScore() != null ? user.getLifetimeScore() : 0;
        int currentScore = user != null && user.getScore() != null ? user.getScore() : 0;

        OffsetDateTime now = OffsetDateTime.now();
        List<Promotion> redeemablePromotions = promotionRepository.findEligiblePromotions(now).stream()
                .filter(Promotion::requiresPointRedemption)
                .filter(p -> !promotionLifecycleService.isUsageExhausted(p))
                .collect(Collectors.toList());

        if (redeemablePromotions.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        List<UUID> promotionIds = redeemablePromotions.stream().map(Promotion::getId).collect(Collectors.toList());
        Map<UUID, Long> globalRedeemCounts = toCountMap(
                userVoucherRepository.countRedeemedGroupByPromotion(promotionIds));
        Set<UUID> activeWalletPromotionIds = userUuid != null
                ? new HashSet<>(userVoucherRepository.findPromotionUuidsByUserAndStatus(
                        userUuid, promotionIds, VoucherRedemptionService.USER_VOUCHER_ACTIVE))
                : Set.of();
        Map<UUID, Long> userRedeemCounts = userUuid != null
                ? toCountMap(userVoucherRepository.countByUserAndPromotionGroup(userUuid, promotionIds))
                : Map.of();

        List<VoucherCatalogResponse> responses = new ArrayList<>();

        for (Promotion promotion : redeemablePromotions) {
            if (userUuid != null && activeWalletPromotionIds.contains(promotion.getId())) {
                continue;
            }

            VoucherCatalogResponse item = new VoucherCatalogResponse();
            item.setId(promotion.getId());
            item.setCode(promotion.getCode());
            item.setDiscountType(promotion.getDiscountType());
            item.setDiscountValue(promotion.getDiscountValue());
            item.setDescription(buildDescription(promotion));
            item.setEndDate(promotion.getEndDate());
            item.setPointsCost(promotion.getPointsCost() != null ? promotion.getPointsCost() : 0);
            item.setMinScore(promotion.getMinScore());
            item.setRequiredTierLabel(MemberTierUtils.resolveRequiredTierLabel(promotion.getMinScore()));
            item.setMaxUsage(promotion.getMaxUsage());
            item.setMaxUsagePerUser(promotion.getMaxUsagePerUser());
            item.setRequiresRedemption(true);

            int remainingGlobal = -1;
            if (promotion.getMaxUsage() != null) {
                long redeemed = globalRedeemCounts.getOrDefault(promotion.getId(), 0L);
                remainingGlobal = (int) Math.max(0, promotion.getMaxUsage() - redeemed);
                if (remainingGlobal <= 0) {
                    continue;
                }
            }
            item.setRemainingGlobal(remainingGlobal);

            int remainingForUser = -1;
            boolean alreadyMaxedForUser = false;
            if (promotion.getMaxUsagePerUser() != null) {
                long userRedeemCount = userRedeemCounts.getOrDefault(promotion.getId(), 0L);
                remainingForUser = Math.max(0, promotion.getMaxUsagePerUser() - (int) userRedeemCount);
                alreadyMaxedForUser = remainingForUser == 0;
            }
            item.setRemainingForUser(remainingForUser);
            item.setAlreadyMaxedForUser(alreadyMaxedForUser);

            if (alreadyMaxedForUser) {
                continue;
            }

            boolean tierOk = MemberTierUtils.meetsTierRequirement(lifetimeScore, promotion.getMinScore());
            boolean pointsOk = currentScore >= (promotion.getPointsCost() != null ? promotion.getPointsCost() : 0);
            boolean eligible = user != null && tierOk && pointsOk;
            item.setEligible(eligible);

            if (user == null) {
                item.setIneligibleReason("Đăng nhập để đổi voucher");
            } else if (!tierOk) {
                item.setIneligibleReason("Yêu cầu hạng " + item.getRequiredTierLabel());
            } else if (!pointsOk) {
                item.setIneligibleReason("Không đủ điểm hiện tại");
            }

            responses.add(item);
        }

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @PostMapping("/{id}/redeem")
    public ResponseEntity<ApiResponse<MyVoucherResponse>> redeemVoucher(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") UUID promotionId) {
        UUID userUuid = resolveUserUuid(userDetails);
        if (userUuid == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn cần đăng nhập để đổi voucher");
        }

        UserVoucher wallet = voucherRedemptionService.redeemPromotion(userUuid, promotionId);
        Promotion promotion = promotionRepository.findByIdAndDeletedAtIsNull(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Không tìm thấy voucher"));

        return ResponseEntity.ok(ApiResponse.success(
                mapWalletToResponse(wallet, promotion),
                promotion.requiresPointRedemption() ? "Đổi voucher thành công" : "Kích hoạt voucher thành công"));
    }

    @GetMapping("/my-vouchers")
    public ResponseEntity<ApiResponse<List<MyVoucherResponse>>> getMyVouchers(
            @AuthenticationPrincipal UserDetails userDetails) {

        UUID userUuid = resolveUserUuid(userDetails);
        if (userUuid == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        User user = userRepository.findById(userUuid).orElse(null);
        int lifetimeScore = user != null && user.getLifetimeScore() != null ? user.getLifetimeScore() : 0;
        OffsetDateTime now = OffsetDateTime.now();

        List<MyVoucherResponse> responses = new ArrayList<>();
        Set<UUID> includedPromotionIds = new HashSet<>();

        List<UserVoucher> wallets = userVoucherRepository.findByUserUuidOrderByRedeemedAtDesc(userUuid);
        List<UUID> walletPromotionIds = wallets.stream()
                .map(UserVoucher::getPromotionUuid)
                .distinct()
                .collect(Collectors.toList());
        Map<UUID, Promotion> walletPromotionMap = walletPromotionIds.isEmpty()
                ? Map.of()
                : promotionRepository.findAllById(walletPromotionIds).stream()
                        .filter(p -> !p.isDeleted())
                        .collect(Collectors.toMap(Promotion::getId, Function.identity()));

        for (UserVoucher wallet : wallets) {
            Promotion promotion = walletPromotionMap.get(wallet.getPromotionUuid());
            if (promotion == null) {
                continue;
            }
            includedPromotionIds.add(promotion.getId());
            responses.add(mapWalletToResponse(wallet, promotion));
        }

        List<Promotion> directPromotions = promotionRepository.findEligiblePromotions(now).stream()
                .filter(p -> !p.requiresPointRedemption())
                .filter(p -> !includedPromotionIds.contains(p.getId()))
                .filter(p -> !promotionLifecycleService.isUsageExhausted(p))
                .filter(p -> MemberTierUtils.meetsTierRequirement(lifetimeScore, p.getMinScore()))
                .collect(Collectors.toList());

        if (!directPromotions.isEmpty()) {
            List<UUID> directIds = directPromotions.stream().map(Promotion::getId).collect(Collectors.toList());
            Map<UUID, Long> userBookingCounts = toCountMap(
                    bookingRepository.countByUserAndPromotionGroup(userUuid, directIds));
            Set<UUID> usedOncePromotionIds = new HashSet<>(
                    bookingRepository.findUsedPromotionUuidsForUser(userUuid, directIds));

            for (Promotion promotion : directPromotions) {
                if (Boolean.TRUE.equals(promotion.getOncePerUser())
                        && usedOncePromotionIds.contains(promotion.getId())) {
                    continue;
                }
                if (promotion.getMaxUsagePerUser() != null) {
                    long userUsageCount = userBookingCounts.getOrDefault(promotion.getId(), 0L);
                    if (userUsageCount >= promotion.getMaxUsagePerUser()) {
                        continue;
                    }
                }
                responses.add(mapDirectUseResponse(promotion, userBookingCounts));
            }
        }

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    private Map<UUID, Long> toCountMap(List<Object[]> rows) {
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null && row[1] != null) {
                map.put((UUID) row[0], ((Number) row[1]).longValue());
            }
        }
        return map;
    }

    private MyVoucherResponse mapDirectUseResponse(Promotion promotion, Map<UUID, Long> userBookingCounts) {
        MyVoucherResponse response = new MyVoucherResponse();
        response.setId(promotion.getId());
        response.setCode(promotion.getCode());
        response.setDiscountType(promotion.getDiscountType());
        response.setDiscountValue(promotion.getDiscountValue());
        response.setDescription(buildDescription(promotion));
        response.setEndDate(promotion.getEndDate());
        response.setOncePerUser(promotion.getOncePerUser());
        response.setPointsCost(0);
        response.setMinScore(promotion.getMinScore());
        response.setRequiredTierLabel(MemberTierUtils.resolveRequiredTierLabel(promotion.getMinScore()));
        response.setActivated(true);
        response.setDirectUse(true);
        response.setUsed(false);

        int remainingUsage = 1;
        if (promotion.getMaxUsagePerUser() != null) {
            long userUsageCount = userBookingCounts.getOrDefault(promotion.getId(), 0L);
            remainingUsage = Math.max(0, promotion.getMaxUsagePerUser() - (int) userUsageCount);
        }
        response.setRemainingUsage(remainingUsage);
        return response;
    }

    private MyVoucherResponse mapWalletToResponse(UserVoucher wallet, Promotion promotion) {
        MyVoucherResponse response = new MyVoucherResponse();
        response.setId(promotion.getId());
        response.setWalletId(wallet.getId());
        response.setCode(promotion.getCode());
        response.setDiscountType(promotion.getDiscountType());
        response.setDiscountValue(promotion.getDiscountValue());
        response.setDescription(buildDescription(promotion));
        response.setEndDate(promotion.getEndDate());
        response.setOncePerUser(promotion.getOncePerUser());
        response.setPointsCost(promotion.getPointsCost());
        response.setMinScore(promotion.getMinScore());
        response.setRequiredTierLabel(MemberTierUtils.resolveRequiredTierLabel(promotion.getMinScore()));
        response.setRedeemedAt(wallet.getRedeemedAt());
        response.setActivated(true);
        response.setDirectUse(false);
        boolean used = VoucherRedemptionService.USER_VOUCHER_USED.equalsIgnoreCase(wallet.getStatus());
        response.setUsed(used);
        response.setRemainingUsage(used ? 0 : 1);
        return response;
    }

    private Optional<String> resolveAvailabilityError(Promotion promotion, OffsetDateTime now) {
        if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
            return Optional.of("Mã khuyến mãi đã hết hạn hoặc vô hiệu lực");
        }
        if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
            return Optional.of("Chương trình khuyến mãi chưa bắt đầu");
        }
        if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
            return Optional.of("Chương trình khuyến mãi đã kết thúc");
        }
        if (promotion.getMaxUsage() != null && promotion.getUsedCount() != null
                && promotion.getUsedCount() >= promotion.getMaxUsage()) {
            return Optional.of("Mã khuyến mãi đã đạt số lượt sử dụng tối đa");
        }
        return Optional.empty();
    }

    private Optional<String> resolveUserUsageError(Promotion promotion, UUID userUuid) {
        if (userUuid == null) {
            return Optional.empty();
        }
        if (Boolean.TRUE.equals(promotion.getOncePerUser())) {
            boolean alreadyUsed = bookingRepository.existsByUserUuidAndPromotionUuid(userUuid, promotion.getId());
            if (alreadyUsed) {
                return Optional.of("Bạn đã sử dụng mã khuyến mãi này rồi");
            }
        }
        if (promotion.getMaxUsagePerUser() != null) {
            long usedCount = promotion.requiresPointRedemption()
                    ? userVoucherRepository.countByUserUuidAndPromotionUuidAndStatus(
                            userUuid, promotion.getId(), VoucherRedemptionService.USER_VOUCHER_USED)
                    : bookingRepository.countByUserUuidAndPromotionUuid(userUuid, promotion.getId());
            if (usedCount >= promotion.getMaxUsagePerUser()) {
                return Optional.of("Bạn đã đạt giới hạn sử dụng voucher này");
            }
        }
        return Optional.empty();
    }

    private UUID resolveUserUuid(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .map(User::getId)
                .orElse(null);
    }

    private String buildDescription(Promotion promotion) {
        if ("PERCENTAGE".equalsIgnoreCase(promotion.getDiscountType())) {
            return "Giảm " + promotion.getDiscountValue().multiply(java.math.BigDecimal.valueOf(100)).intValue()
                    + "% tiền vé khi đặt vé trực tuyến trên hệ thống NASA Film.";
        }
        return "Giảm " + formatPrice(promotion.getDiscountValue())
                + " đ trực tiếp vào hóa đơn đặt vé xem phim trực tuyến.";
    }

    private String buildBadge(Promotion promotion) {
        if ("PERCENTAGE".equalsIgnoreCase(promotion.getDiscountType())) {
            return "-" + promotion.getDiscountValue().multiply(java.math.BigDecimal.valueOf(100)).intValue() + "%";
        }
        java.math.BigDecimal value = promotion.getDiscountValue();
        if (value != null && value.remainder(java.math.BigDecimal.valueOf(1000)).compareTo(java.math.BigDecimal.ZERO) == 0) {
            return "-" + value.divide(java.math.BigDecimal.valueOf(1000)).intValue() + "K";
        }
        return "-" + formatPrice(value) + "đ";
    }

    private String buildPublicTitle(Promotion promotion) {
        if (promotion.requiresPointRedemption()) {
            return "Voucher thành viên " + promotion.getCode();
        }
        if (Boolean.TRUE.equals(promotion.getOncePerUser())) {
            return "Quà tặng thành viên mới " + promotion.getCode();
        }
        return "Khuyến mãi " + promotion.getCode();
    }

    private String buildPublicCategory(Promotion promotion) {
        if (promotion.requiresPointRedemption() || Boolean.TRUE.equals(promotion.getOncePerUser())) {
            return "VIP / Member";
        }
        return "Vé Xem Phim";
    }

    private String buildPublicDetails(Promotion promotion) {
        StringBuilder details = new StringBuilder(buildDescription(promotion));
        if (Boolean.TRUE.equals(promotion.getOncePerUser())) {
            details.append(" Giới hạn mỗi tài khoản chỉ được sử dụng một lần.");
        }
        if (promotion.requiresPointRedemption()) {
            details.append(" Voucher yêu cầu đổi điểm thưởng trước khi áp dụng khi thanh toán.");
        } else {
            details.append(" Nhập mã khi thanh toán để áp dụng ưu đãi.");
        }
        return details.toString();
    }

    private String formatPrice(java.math.BigDecimal price) {
        if (price == null) {
            return "0";
        }
        java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###");
        return formatter.format(price).replace(",", ".");
    }
}
