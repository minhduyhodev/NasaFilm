package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentGatewayService {

    GatewayChargeResult charge(UUID paymentUuid, BigDecimal amount, String idempotencyKey);

    GatewayRefundResult refund(UUID paymentUuid, BigDecimal amount, String idempotencyKey);

    record GatewayChargeResult(boolean success, String gatewayTransactionId, String failureReason) {
    }

    record GatewayRefundResult(boolean success, String gatewayRefundId, String failureReason) {
    }
}
