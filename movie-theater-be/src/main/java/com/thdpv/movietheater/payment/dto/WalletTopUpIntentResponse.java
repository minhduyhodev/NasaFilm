package com.thdpv.movietheater.payment.dto;

public class WalletTopUpIntentResponse {

    private String paymentIntentId;
    private String clientSecret;
    private String status;
    private Long amount;
    private String currency;
    private boolean mockMode;

    public WalletTopUpIntentResponse() {
    }

    public WalletTopUpIntentResponse(
            String paymentIntentId,
            String clientSecret,
            String status,
            Long amount,
            String currency,
            boolean mockMode) {
        this.paymentIntentId = paymentIntentId;
        this.clientSecret = clientSecret;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
        this.mockMode = mockMode;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public boolean isMockMode() {
        return mockMode;
    }

    public void setMockMode(boolean mockMode) {
        this.mockMode = mockMode;
    }
}
