package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "mock", matchIfMissing = true)
public class MockPaymentGatewayService implements PaymentGatewayService {

    private final Map<String, GatewayChargeResult> processedCharges = new ConcurrentHashMap<>();
    private final Map<String, GatewayRefundResult> processedRefunds = new ConcurrentHashMap<>();

    @Override
    public GatewayChargeResult charge(UUID paymentUuid, BigDecimal amount, String idempotencyKey) {
        if (idempotencyKey != null && processedCharges.containsKey(idempotencyKey)) {
            return processedCharges.get(idempotencyKey);
        }
        GatewayChargeResult result = new GatewayChargeResult(
                true,
                "MOCK-PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                null);
        if (idempotencyKey != null) {
            processedCharges.put(idempotencyKey, result);
        }
        return result;
    }

    @Override
    public GatewayRefundResult refund(UUID paymentUuid, BigDecimal amount, String idempotencyKey) {
        if (idempotencyKey != null && processedRefunds.containsKey(idempotencyKey)) {
            return processedRefunds.get(idempotencyKey);
        }
        GatewayRefundResult result = new GatewayRefundResult(
                true,
                "MOCK-RF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                null);
        if (idempotencyKey != null) {
            processedRefunds.put(idempotencyKey, result);
        }
        return result;
    }
}
