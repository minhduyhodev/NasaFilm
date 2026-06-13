package com.thdpv.movietheater.booking.dto.request;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class PromotionRequest {

    @NotBlank(message = "Mã khuyến mãi không được để trống")
    @Size(max = 255, message = "Mã khuyến mãi không được dài quá 255 ký tự")
    private String code;

    @NotNull(message = "Giá trị giảm giá không được để trống")
    private BigDecimal discountValue;

    @NotBlank(message = "Loại giảm giá không được để trống")
    private String discountType;

    private OffsetDateTime startDate;

    private OffsetDateTime endDate;

    private Integer maxUsage;

    private Boolean oncePerUser;

    private String status;

    public PromotionRequest() {
    }

    public PromotionRequest(String code, BigDecimal discountValue, String discountType, OffsetDateTime startDate, OffsetDateTime endDate, Integer maxUsage, Boolean oncePerUser, String status) {
        this.code = code;
        this.discountValue = discountValue;
        this.discountType = discountType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.maxUsage = maxUsage;
        this.oncePerUser = oncePerUser;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public BigDecimal getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(BigDecimal discountValue) {
        this.discountValue = discountValue;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public OffsetDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(OffsetDateTime startDate) {
        this.startDate = startDate;
    }

    public OffsetDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(OffsetDateTime endDate) {
        this.endDate = endDate;
    }

    public Integer getMaxUsage() {
        return maxUsage;
    }

    public void setMaxUsage(Integer maxUsage) {
        this.maxUsage = maxUsage;
    }

    public Boolean getOncePerUser() {
        return oncePerUser;
    }

    public void setOncePerUser(Boolean oncePerUser) {
        this.oncePerUser = oncePerUser;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
