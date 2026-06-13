package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class MyVoucherResponse {
    private UUID id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private String description;
    private OffsetDateTime endDate;
    private Boolean oncePerUser;
    private boolean used;
    private int remainingUsage;

    public MyVoucherResponse() {
    }

    public MyVoucherResponse(UUID id, String code, String discountType, BigDecimal discountValue, String description,
            OffsetDateTime endDate, Boolean oncePerUser, boolean used, int remainingUsage) {
        this.id = id;
        this.code = code;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.description = description;
        this.endDate = endDate;
        this.oncePerUser = oncePerUser;
        this.used = used;
        this.remainingUsage = remainingUsage;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDiscountType() {
        return discountType;
    }

    public void setDiscountType(String discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(BigDecimal discountValue) {
        this.discountValue = discountValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public OffsetDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(OffsetDateTime endDate) {
        this.endDate = endDate;
    }

    public Boolean getOncePerUser() {
        return oncePerUser;
    }

    public void setOncePerUser(Boolean oncePerUser) {
        this.oncePerUser = oncePerUser;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }

    public int getRemainingUsage() {
        return remainingUsage;
    }

    public void setRemainingUsage(int remainingUsage) {
        this.remainingUsage = remainingUsage;
    }
}
