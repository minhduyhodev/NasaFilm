package com.thdpv.movietheater.payment.stripe.domain;

public class PaymentIntentResult {
    private String id;
    private String clientSecret;
    private String status;

    public PaymentIntentResult() {
    }

    public PaymentIntentResult(String id, String clientSecret, String status) {
        this.id = id;
        this.clientSecret = clientSecret;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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
}
