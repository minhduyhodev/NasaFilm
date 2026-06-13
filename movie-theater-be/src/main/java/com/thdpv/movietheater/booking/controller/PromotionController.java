package com.thdpv.movietheater.booking.controller;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.PromotionValidateResponse;
import com.thdpv.movietheater.booking.dto.response.MyVoucherResponse;
import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
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

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<PromotionValidateResponse>> validatePromotion(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("code") String code) {

        String trimmedCode = code != null ? code.trim() : "";
        if (trimmedCode.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, "", "", null, "", "Mã khuyến mãi không được trống")));
        }

        Optional<Promotion> promoOpt = promotionRepository.findByCodeIgnoreCase(trimmedCode);
        if (promoOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, trimmedCode, "", null, "", "Mã khuyến mãi không tồn tại")));
        }

        Promotion promotion = promoOpt.get();
        OffsetDateTime now = OffsetDateTime.now();

        if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", "Mã khuyến mãi đã hết hạn hoặc vô hiệu lực")));
        }

        if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", "Chương trình khuyến mãi chưa bắt đầu")));
        }

        if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", "Chương trình khuyến mãi đã kết thúc")));
        }

        if (promotion.getMaxUsage() != null && promotion.getUsedCount() != null
                && promotion.getUsedCount() >= promotion.getMaxUsage()) {
            return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                    false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                    "", "Mã khuyến mãi đã đạt số lượt sử dụng tối đa")));
        }

        // Check if voucher is once-per-user and user already used it
        if (Boolean.TRUE.equals(promotion.getOncePerUser()) && userDetails != null) {
            Optional<User> userOpt = userRepository.findByEmailIgnoreCase(userDetails.getUsername());
            if (userOpt.isPresent()) {
                UUID userUuid = userOpt.get().getId();
                boolean alreadyUsed = bookingRepository.existsByUserUuidAndPromotionUuid(userUuid, promotion.getId());
                if (alreadyUsed) {
                    return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                            false, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                            "", "Bạn đã sử dụng mã khuyến mãi này rồi")));
                }
            }
        }

        String desc = "PERCENTAGE".equalsIgnoreCase(promotion.getDiscountType())
                ? "Giảm " + promotion.getDiscountValue().multiply(java.math.BigDecimal.valueOf(100)).intValue() + "% tiền vé"
                : "Giảm " + formatPrice(promotion.getDiscountValue()) + " đ";

        return ResponseEntity.ok(ApiResponse.success(new PromotionValidateResponse(
                true, promotion.getCode(), promotion.getDiscountType(), promotion.getDiscountValue(),
                desc, null)));
    }

    @GetMapping("/my-vouchers")
    public ResponseEntity<ApiResponse<List<MyVoucherResponse>>> getMyVouchers(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        List<Promotion> promotions = promotionRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now();
        UUID userUuid = null;
        if (userDetails != null) {
            userUuid = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                    .map(User::getId)
                    .orElse(null);
        }
        
        final UUID finalUserUuid = userUuid;
        List<MyVoucherResponse> responses = new ArrayList<>();
        for (Promotion promotion : promotions) {
            // Only return active and current promotions
            if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
                continue;
            }
            if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
                continue;
            }
            if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
                continue;
            }
            
            // Check if global usage limit is reached
            int remainingGlobal = -1;
            if (promotion.getMaxUsage() != null) {
                remainingGlobal = promotion.getMaxUsage() - (promotion.getUsedCount() != null ? promotion.getUsedCount() : 0);
                if (remainingGlobal <= 0) {
                    continue; // Skip if sold out globally
                }
            }
            
            // Check user usage
            boolean used = false;
            if (finalUserUuid != null && Boolean.TRUE.equals(promotion.getOncePerUser())) {
                used = bookingRepository.existsByUserUuidAndPromotionUuid(finalUserUuid, promotion.getId());
            }
            
            // Calculate remaining times for the user
            int remainingUsage = 1;
            if (Boolean.FALSE.equals(promotion.getOncePerUser())) {
                remainingUsage = remainingGlobal > 0 ? remainingGlobal : 999;
            } else {
                remainingUsage = used ? 0 : 1;
            }
            
            String desc = "PERCENTAGE".equalsIgnoreCase(promotion.getDiscountType())
                    ? "Giảm " + promotion.getDiscountValue().multiply(java.math.BigDecimal.valueOf(100)).intValue() + "% tiền vé"
                    : "Giảm " + formatPrice(promotion.getDiscountValue()) + " đ vào hóa đơn";
            
            responses.add(new MyVoucherResponse(
                    promotion.getId(),
                    promotion.getCode(),
                    promotion.getDiscountType(),
                    promotion.getDiscountValue(),
                    desc,
                    promotion.getEndDate(),
                    promotion.getOncePerUser(),
                    used,
                    remainingUsage
            ));
        }
        
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    private String formatPrice(java.math.BigDecimal price) {
        if (price == null) return "0";
        java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###");
        return formatter.format(price).replace(",", ".");
    }
}
