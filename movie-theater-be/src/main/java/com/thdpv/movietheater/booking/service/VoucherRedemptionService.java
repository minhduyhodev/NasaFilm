package com.thdpv.movietheater.booking.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.entity.UserVoucher;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.booking.repository.UserVoucherRepository;
import com.thdpv.movietheater.booking.util.MemberTierUtils;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class VoucherRedemptionService {

    public static final String USER_VOUCHER_ACTIVE = "ACTIVE";
    public static final String USER_VOUCHER_USED = "USED";

    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final PromotionLifecycleService promotionLifecycleService;
    private final BookingNativeRepository bookingNativeRepository;

    public VoucherRedemptionService(
            PromotionRepository promotionRepository,
            UserRepository userRepository,
            UserVoucherRepository userVoucherRepository,
            PromotionLifecycleService promotionLifecycleService,
            BookingNativeRepository bookingNativeRepository) {
        this.promotionRepository = promotionRepository;
        this.userRepository = userRepository;
        this.userVoucherRepository = userVoucherRepository;
        this.promotionLifecycleService = promotionLifecycleService;
        this.bookingNativeRepository = bookingNativeRepository;
    }

    @Transactional
    public UserVoucher redeemPromotion(UUID userUuid, UUID promotionId) {
        Promotion promotion = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Không tìm thấy voucher"));

        User user = userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        OffsetDateTime now = OffsetDateTime.now();
        validatePromotionAvailability(promotion, now);

        if (!promotion.requiresPointRedemption()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Voucher này không hỗ trợ đổi điểm");
        }

        int lifetimeScore = user.getLifetimeScore() != null ? user.getLifetimeScore() : 0;
        if (!MemberTierUtils.meetsTierRequirement(lifetimeScore, promotion.getMinScore())) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Bạn chưa đủ hạng thành viên để đổi voucher này (yêu cầu: "
                            + MemberTierUtils.resolveRequiredTierLabel(promotion.getMinScore()) + ")");
        }

        int currentScore = user.getScore() != null ? user.getScore() : 0;
        if (currentScore < promotion.getPointsCost()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không đủ điểm để đổi voucher");
        }

        long userRedeemCount = userVoucherRepository.countByUserUuidAndPromotionUuid(userUuid, promotionId);
        if (promotion.getMaxUsagePerUser() != null && userRedeemCount >= promotion.getMaxUsagePerUser()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã đạt giới hạn đổi voucher này trên tài khoản");
        }

        if (promotion.getMaxUsage() != null) {
            long totalRedeemed = userVoucherRepository.countByPromotionUuid(promotionId);
            if (totalRedeemed >= promotion.getMaxUsage()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Voucher đã hết lượt phát hành trên toàn hệ thống");
            }
        }

        bookingNativeRepository.addUserScore(userUuid, -promotion.getPointsCost());
        bookingNativeRepository.queryInsertScoreHistory(
                UUID.randomUUID(),
                userUuid,
                -promotion.getPointsCost(),
                "REDEEM",
                "Đổi voucher " + promotion.getCode(),
                now);

        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setId(UUID.randomUUID());
        userVoucher.setUserUuid(userUuid);
        userVoucher.setPromotionUuid(promotionId);
        userVoucher.setStatus(USER_VOUCHER_ACTIVE);
        userVoucher.setRedeemedAt(now);
        return userVoucherRepository.save(userVoucher);
    }

    public void validatePromotionAvailability(Promotion promotion, OffsetDateTime now) {
        if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Voucher không còn hiệu lực");
        }
        if (promotionLifecycleService.isNotStarted(promotion, now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Voucher chưa bắt đầu hiệu lực");
        }
        if (promotionLifecycleService.isExpired(promotion, now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Voucher đã hết hạn");
        }
        if (promotionLifecycleService.isUsageExhausted(promotion)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Voucher đã hết lượt sử dụng trên hệ thống");
        }
    }

    @Transactional
    public UserVoucher consumeActiveVoucher(UUID userUuid, Promotion promotion, UUID bookingUuid, OffsetDateTime now) {
        if (!promotion.requiresPointRedemption()) {
            return null;
        }

        UserVoucher userVoucher = userVoucherRepository
                .findFirstByUserUuidAndPromotionUuidAndStatusOrderByRedeemedAtAsc(
                        userUuid, promotion.getId(), USER_VOUCHER_ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST,
                        "Bạn cần đổi điểm để kích hoạt voucher trước khi sử dụng"));

        userVoucher.setStatus(USER_VOUCHER_USED);
        userVoucher.setUsedAt(now);
        userVoucher.setBookingUuid(bookingUuid);
        return userVoucherRepository.save(userVoucher);
    }
}
