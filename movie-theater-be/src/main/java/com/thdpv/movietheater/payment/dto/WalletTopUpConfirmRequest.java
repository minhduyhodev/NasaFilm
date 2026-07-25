package com.thdpv.movietheater.payment.dto;

import jakarta.validation.constraints.NotBlank;

public class WalletTopUpConfirmRequest {

    @NotBlank
    private String paymentIntentId;

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }
}
