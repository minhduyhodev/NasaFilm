package com.thdpv.movietheater.booking.controller;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.PromotionRequest;
import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/promotions")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPromotionController {

    private final PromotionRepository promotionRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Promotion>>> getAllPromotions() {
        List<Promotion> promotions = promotionRepository.findAll();
        promotions.sort((p1, p2) -> {
            OffsetDateTime t1 = p1.getCreatedAt();
            OffsetDateTime t2 = p2.getCreatedAt();
            if (t1 == null && t2 == null) return 0;
            if (t1 == null) return 1;
            if (t2 == null) return -1;
            return t2.compareTo(t1);
        });
        return ResponseEntity.ok(ApiResponse.success(promotions));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Promotion>> createPromotion(
            @Valid @RequestBody PromotionRequest request) {
        
        String trimmedCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (trimmedCode.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi không được trống");
        }

        if (promotionRepository.findByCodeIgnoreCase(trimmedCode).isPresent()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã tồn tại");
        }

        Promotion promotion = new Promotion();
        promotion.setId(UUID.randomUUID());
        promotion.setCode(trimmedCode);
        promotion.setDiscountType(request.getDiscountType());
        
        if ("PERCENTAGE".equalsIgnoreCase(request.getDiscountType())) {
            if (request.getDiscountValue() == null || request.getDiscountValue().doubleValue() <= 0 || request.getDiscountValue().doubleValue() > 1.0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Giá trị giảm giá theo phần trăm phải nằm trong khoảng (0, 1]");
            }
        } else {
            if (request.getDiscountValue() == null || request.getDiscountValue().doubleValue() <= 0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Giá trị giảm giá cố định phải lớn hơn 0");
            }
        }
        promotion.setDiscountValue(request.getDiscountValue());
        
        promotion.setStartDate(request.getStartDate());
        promotion.setEndDate(request.getEndDate());
        promotion.setMaxUsage(request.getMaxUsage());
        promotion.setOncePerUser(request.getOncePerUser() != null ? request.getOncePerUser() : false);
        promotion.setStatus(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE");
        promotion.setUsedCount(0);
        promotion.setCreatedAt(OffsetDateTime.now());
        promotion.setUpdatedAt(OffsetDateTime.now());

        Promotion saved = promotionRepository.save(promotion);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Promotion>> updatePromotion(
            @PathVariable("id") UUID id,
            @Valid @RequestBody PromotionRequest request) {
        
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Không tìm thấy khuyến mãi"));

        String trimmedCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (trimmedCode.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi không được trống");
        }

        if (!promotion.getCode().equalsIgnoreCase(trimmedCode)) {
            if (promotionRepository.findByCodeIgnoreCase(trimmedCode).isPresent()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã tồn tại");
            }
            promotion.setCode(trimmedCode);
        }

        promotion.setDiscountType(request.getDiscountType());
        
        if ("PERCENTAGE".equalsIgnoreCase(request.getDiscountType())) {
            if (request.getDiscountValue() == null || request.getDiscountValue().doubleValue() <= 0 || request.getDiscountValue().doubleValue() > 1.0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Giá trị giảm giá theo phần trăm phải nằm trong khoảng (0, 1]");
            }
        } else {
            if (request.getDiscountValue() == null || request.getDiscountValue().doubleValue() <= 0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Giá trị giảm giá cố định phải lớn hơn 0");
            }
        }
        promotion.setDiscountValue(request.getDiscountValue());
        
        promotion.setStartDate(request.getStartDate());
        promotion.setEndDate(request.getEndDate());
        promotion.setMaxUsage(request.getMaxUsage());
        promotion.setOncePerUser(request.getOncePerUser() != null ? request.getOncePerUser() : false);
        promotion.setStatus(request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "ACTIVE");
        promotion.setUpdatedAt(OffsetDateTime.now());

        Promotion saved = promotionRepository.save(promotion);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable("id") UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Không tìm thấy khuyến mãi"));
        promotionRepository.delete(promotion);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa khuyến mãi thành công"));
    }
}
