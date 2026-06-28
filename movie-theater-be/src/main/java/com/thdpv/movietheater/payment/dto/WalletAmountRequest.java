package com.thdpv.movietheater.payment.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public class WalletAmountRequest {

    @NotNull
    @DecimalMin(value = "10000", message = "Số tiền tối thiểu là 10.000đ")
    private BigDecimal amount;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
