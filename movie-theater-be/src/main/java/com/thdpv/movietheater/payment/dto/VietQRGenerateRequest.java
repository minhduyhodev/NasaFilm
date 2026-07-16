package com.thdpv.movietheater.payment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class VietQRGenerateRequest {

    @NotNull(message = "Số tiền không được để trống")
    @Min(value = 1000, message = "Số tiền tối thiểu là 1.000đ")
    private Long amount;

    private String description;

    public VietQRGenerateRequest() {
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
