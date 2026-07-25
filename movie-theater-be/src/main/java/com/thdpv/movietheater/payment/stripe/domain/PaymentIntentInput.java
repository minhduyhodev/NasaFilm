package com.thdpv.movietheater.payment.stripe.domain;

import java.util.LinkedHashMap;
import java.util.Map;

public class PaymentIntentInput {
    private Long amount;
    private String currency;
    private Map<String, String> metadata = new LinkedHashMap<>();

    public PaymentIntentInput() {
    }

    public PaymentIntentInput(Long amount, String currency) {
        this.amount = amount;
        this.currency = currency;
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

    public Map<String, String> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata != null ? metadata : new LinkedHashMap<>();
    }

    public void putMetadata(String key, String value) {
        if (key == null || value == null) {
            return;
        }
        this.metadata.put(key, value);
    }
}
