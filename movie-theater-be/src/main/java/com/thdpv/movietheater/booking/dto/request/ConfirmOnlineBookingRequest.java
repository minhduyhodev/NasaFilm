package com.thdpv.movietheater.booking.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ConfirmOnlineBookingRequest {
    private UUID movieUuid;
    private String promotionCode;
    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Pattern(regexp = "(?i)^(wallet|card|vietqr)$", message = "Phương thức thanh toán không hợp lệ")
    private String paymentMethod;
    private String paymentIntentId;

    public ConfirmOnlineBookingRequest() {
    }

    public ConfirmOnlineBookingRequest(UUID movieUuid, String promotionCode) {
        this.movieUuid = movieUuid;
        this.promotionCode = promotionCode;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public String getPromotionCode() {
        return promotionCode;
    }

    public void setPromotionCode(String promotionCode) {
        this.promotionCode = promotionCode;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }
}
