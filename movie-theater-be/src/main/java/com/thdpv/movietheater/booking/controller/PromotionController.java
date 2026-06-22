package com.thdpv.movietheater.booking.controller;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

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

        String trimmedCode = code != null ? code.trim() : "";
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
        List<VoucherCatalogResponse> responses = new ArrayList<>();

        for (Promotion promotion : promotionRepository.findAllByDeletedAtIsNull()) {
            if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
                continue;
            }
            if (promotionLifecycleService.isNotStarted(promotion, now)
                    || promotionLifecycleService.isExpired(promotion, now)
                    || promotionLifecycleService.isUsageExhausted(promotion)) {
                continue;
            }

            boolean requiresRedemption = promotion.requiresPointRedemption();
            if (!requiresRedemption) {
                continue;
            }

            if (userUuid != null) {
                long activeWallet = userVoucherRepository.countByUserUuidAndPromotionUuidAndStatus(
                        userUuid, promotion.getId(), VoucherRedemptionService.USER_VOUCHER_ACTIVE);
                if (activeWallet > 0) {
                    continue;
                }
            }

            VoucherCatalogResponse item = new VoucherCatalogResponse();
            item.setId(promotion.getId());
            item.setCode(promotion.getCode());
            item.setDiscountType(promotion.getDiscountType());
            item.setDiscountValue(promotion.getDiscountValue());
            item.setDescription(buildDescription(promotion));
            item.setEndDate(promotion.getEndDate());
            item.setPointsCost(requiresRedemption ? promotion.getPointsCost() : 0);
            item.setMinScore(promotion.getMinScore());
            item.setRequiredTierLabel(MemberTierUtils.resolveRequiredTierLabel(promotion.getMinScore()));
            item.setMaxUsage(promotion.getMaxUsage());
            item.setMaxUsagePerUser(promotion.getMaxUsagePerUser());
            item.setRequiresRedemption(requiresRedemption);

            int remainingGlobal = -1;
            if (promotion.getMaxUsage() != null) {
                if (requiresRedemption) {
                    long redeemed = userVoucherRepository.countByPromotionUuid(promotion.getId());
                    remainingGlobal = (int) Math.max(0, promotion.getMaxUsage() - redeemed);
                } else {
                    int usedCount = promotion.getUsedCount() != null ? promotion.getUsedCount() : 0;
                    remainingGlobal = Math.max(0, promotion.getMaxUsage() - usedCount);
                }
                if (remainingGlobal <= 0) {
                    continue;
                }
            }
            item.setRemainingGlobal(remainingGlobal);

            int remainingForUser = -1;
            boolean alreadyMaxedForUser = false;
            if (requiresRedemption) {
                int userRedeemCount = userUuid != null
                        ? (int) userVoucherRepository.countByUserUuidAndPromotionUuid(userUuid, promotion.getId())
                        : 0;
                if (promotion.getMaxUsagePerUser() != null) {
                    remainingForUser = Math.max(0, promotion.getMaxUsagePerUser() - userRedeemCount);
                    alreadyMaxedForUser = remainingForUser == 0;
                }
            } else if (userUuid != null && Boolean.TRUE.equals(promotion.getOncePerUser())) {
                boolean alreadyUsed = bookingRepository.existsByUserUuidAndPromotionUuid(userUuid, promotion.getId());
                remainingForUser = alreadyUsed ? 0 : 1;
                alreadyMaxedForUser = alreadyUsed;
            }
            item.setRemainingForUser(remainingForUser);
            item.setAlreadyMaxedForUser(alreadyMaxedForUser);

            if (alreadyMaxedForUser) {
                continue;
            }

            boolean tierOk = MemberTierUtils.meetsTierRequirement(lifetimeScore, promotion.getMinScore());
            boolean pointsOk = !requiresRedemption
                    || currentScore >= (promotion.getPointsCost() != null ? promotion.getPointsCost() : 0);
            boolean eligible = user != null && tierOk && pointsOk;
            item.setEligible(eligible);

            if (user == null) {
                item.setIneligibleReason(requiresRedemption ? "Đăng nhập để đổi voucher" : "Đăng nhập để nhận voucher");
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

        for (UserVoucher wallet : userVoucherRepository.findByUserUuidOrderByRedeemedAtDesc(userUuid)) {
            promotionRepository.findById(wallet.getPromotionUuid()).ifPresent(promotion -> {
                if (promotion.isDeleted()) {
                    return;
                }
                includedPromotionIds.add(promotion.getId());
                responses.add(mapWalletToResponse(wallet, promotion));
            });
        }

        for (Promotion promotion : promotionRepository.findAllByDeletedAtIsNull()) {
            if (promotion.requiresPointRedemption()) {
                continue;
            }
            if (includedPromotionIds.contains(promotion.getId())) {
                continue;
            }
            if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
                continue;
            }
            if (promotionLifecycleService.isNotStarted(promotion, now)
                    || promotionLifecycleService.isExpired(promotion, now)
                    || promotionLifecycleService.isUsageExhausted(promotion)) {
                continue;
            }
            if (!MemberTierUtils.meetsTierRequirement(lifetimeScore, promotion.getMinScore())) {
                continue;
            }
            if (Boolean.TRUE.equals(promotion.getOncePerUser())
                    && bookingRepository.existsByUserUuidAndPromotionUuid(userUuid, promotion.getId())) {
                continue;
            }
            if (promotion.getMaxUsagePerUser() != null) {
                long userUsageCount = bookingRepository.countByUserUuidAndPromotionUuid(userUuid, promotion.getId());
                if (userUsageCount >= promotion.getMaxUsagePerUser()) {
                    continue;
                }
            }

            responses.add(mapDirectUseResponse(promotion, userUuid));
        }

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    private MyVoucherResponse mapDirectUseResponse(Promotion promotion, UUID userUuid) {
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
            long userUsageCount = bookingRepository.countByUserUuidAndPromotionUuid(userUuid, promotion.getId());
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
                    + "% tiền vé";
        }
        return "Giảm " + formatPrice(promotion.getDiscountValue()) + " đ";
    }

    private String formatPrice(java.math.BigDecimal price) {
        if (price == null) {
            return "0";
        }
        java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###");
        return formatter.format(price).replace(",", ".");
    }
}
