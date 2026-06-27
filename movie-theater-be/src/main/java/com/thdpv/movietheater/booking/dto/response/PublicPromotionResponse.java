package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class PublicPromotionResponse {

    private UUID id;
    private String code;
    private String title;
    private String description;
    private String category;
    private String badge;
    private String details;
    private String discountType;
    private BigDecimal discountValue;
    private OffsetDateTime endDate;
    private boolean oncePerUser;
    private boolean requiresRedemption;
    private Integer pointsCost;

    public PublicPromotionResponse() {
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getBadge() {
        return badge;
    }

    public void setBadge(String badge) {
        this.badge = badge;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
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

    public OffsetDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(OffsetDateTime endDate) {
        this.endDate = endDate;
    }

    public boolean isOncePerUser() {
        return oncePerUser;
    }

    public void setOncePerUser(boolean oncePerUser) {
        this.oncePerUser = oncePerUser;
    }

    public boolean isRequiresRedemption() {
        return requiresRedemption;
    }

    public void setRequiresRedemption(boolean requiresRedemption) {
        this.requiresRedemption = requiresRedemption;
    }

    public Integer getPointsCost() {
        return pointsCost;
    }

    public void setPointsCost(Integer pointsCost) {
        this.pointsCost = pointsCost;
    }
}
