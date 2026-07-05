package com.thdpv.movietheater.payment.stripe.domain;

public class WebhookResult {
    private String id;
    private String type;
    private String status;
    private String paymentIntentId;

    public WebhookResult() {
    }

    public WebhookResult(String id, String type, String status, String paymentIntentId) {
        this.id = id;
        this.type = type;
        this.status = status;
        this.paymentIntentId = paymentIntentId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }
}
