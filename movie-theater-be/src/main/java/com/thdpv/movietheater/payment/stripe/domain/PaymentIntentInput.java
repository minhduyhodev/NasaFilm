package com.thdpv.movietheater.payment.stripe.domain;

public class PaymentIntentInput {
    private Long amount;
    private String currency;

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
}
