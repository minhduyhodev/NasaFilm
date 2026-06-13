package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;

public class PromotionValidateResponse {
    private boolean valid;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private String description;
    private String errorMessage;

    public PromotionValidateResponse() {
    }

    public PromotionValidateResponse(boolean valid, String code, String discountType, BigDecimal discountValue,
            String description, String errorMessage) {
        this.valid = valid;
        this.code = code;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.description = description;
        this.errorMessage = errorMessage;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
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

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
