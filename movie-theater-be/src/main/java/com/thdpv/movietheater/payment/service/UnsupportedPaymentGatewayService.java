package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;

/**
 * Fail-closed gateway for legacy CARD/external charge+refund paths that are not Wallet / VietQR / Counter /
 * Stripe PaymentIntent. Stripe booking flows reconcile the PI then mark Payment COMPLETED in PaymentService
 * without calling this bean.
 */
@Service
public class UnsupportedPaymentGatewayService implements PaymentGatewayService {

    private static final String MESSAGE =
            "Thanh toán qua cổng giả lập đã bị tắt. Dùng Stripe, VietQR hoặc ví NASA.";

    @Override
    public GatewayChargeResult charge(UUID paymentUuid, BigDecimal amount, String idempotencyKey) {
        return new GatewayChargeResult(false, null, MESSAGE);
    }

    @Override
    public GatewayRefundResult refund(UUID paymentUuid, BigDecimal amount, String idempotencyKey) {
        return new GatewayRefundResult(false, null, MESSAGE);
    }
}
