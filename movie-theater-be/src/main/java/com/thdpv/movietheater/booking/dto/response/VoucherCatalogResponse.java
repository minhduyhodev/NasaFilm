package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class VoucherCatalogResponse {

    private UUID id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private String description;
    private OffsetDateTime endDate;
    private Integer pointsCost;
    private Integer minScore;
    private String requiredTierLabel;
    private Integer maxUsage;
    private Integer maxUsagePerUser;
    private Integer remainingGlobal;
    private Integer remainingForUser;
    private boolean eligible;
    private boolean alreadyMaxedForUser;
    private String ineligibleReason;

    public VoucherCatalogResponse() {
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

    public Integer getPointsCost() {
        return pointsCost;
    }

    public void setPointsCost(Integer pointsCost) {
        this.pointsCost = pointsCost;
    }

    public Integer getMinScore() {
        return minScore;
    }

    public void setMinScore(Integer minScore) {
        this.minScore = minScore;
    }

    public String getRequiredTierLabel() {
        return requiredTierLabel;
    }

    public void setRequiredTierLabel(String requiredTierLabel) {
        this.requiredTierLabel = requiredTierLabel;
    }

    public Integer getMaxUsage() {
        return maxUsage;
    }

    public void setMaxUsage(Integer maxUsage) {
        this.maxUsage = maxUsage;
    }

    public Integer getMaxUsagePerUser() {
        return maxUsagePerUser;
    }

    public void setMaxUsagePerUser(Integer maxUsagePerUser) {
        this.maxUsagePerUser = maxUsagePerUser;
    }

    public Integer getRemainingGlobal() {
        return remainingGlobal;
    }

    public void setRemainingGlobal(Integer remainingGlobal) {
        this.remainingGlobal = remainingGlobal;
    }

    public Integer getRemainingForUser() {
        return remainingForUser;
    }

    public void setRemainingForUser(Integer remainingForUser) {
        this.remainingForUser = remainingForUser;
    }

    public boolean isEligible() {
        return eligible;
    }

    public void setEligible(boolean eligible) {
        this.eligible = eligible;
    }

    public boolean isAlreadyMaxedForUser() {
        return alreadyMaxedForUser;
    }

    public void setAlreadyMaxedForUser(boolean alreadyMaxedForUser) {
        this.alreadyMaxedForUser = alreadyMaxedForUser;
    }

    public String getIneligibleReason() {
        return ineligibleReason;
    }

    public void setIneligibleReason(String ineligibleReason) {
        this.ineligibleReason = ineligibleReason;
    }
}
