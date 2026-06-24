package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.Payment;
import com.thdpv.movietheater.booking.enums.PaymentStatus;
import com.thdpv.movietheater.booking.repository.PaymentRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayService paymentGatewayService;

    @Value("${app.payment.provider:mock}")
    private String paymentProvider;

    public PaymentService(PaymentRepository paymentRepository, PaymentGatewayService paymentGatewayService) {
        this.paymentRepository = paymentRepository;
        this.paymentGatewayService = paymentGatewayService;
    }

    public String getProviderName() {
        return paymentProvider;
    }

    @Transactional
    public Payment chargeBooking(UUID bookingUuid, BigDecimal amount, String method, String idempotencyKey) {
        if (bookingUuid == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Booking uuid không hợp lệ");
        }
        BigDecimal chargeAmount = amount != null ? amount : BigDecimal.ZERO;
        String key = idempotencyKey != null && !idempotencyKey.isBlank()
                ? idempotencyKey.trim()
                : "pay-" + bookingUuid;

        return paymentRepository.findByIdempotencyKey(key)
                .filter(p -> PaymentStatus.COMPLETED.name().equals(p.getStatus()))
                .orElseGet(() -> executeCharge(bookingUuid, chargeAmount, method, key));
    }

    @Transactional
    public Payment ensureCompletedPayment(Booking booking, String method) {
        return paymentRepository.findFirstByBookingUuidOrderByCreatedAtDesc(booking.getUuid())
                .orElseGet(() -> chargeBooking(
                        booking.getUuid(),
                        booking.getTotalPrice(),
                        method != null ? method : "MOCK",
                        "pay-" + booking.getUuid()));
    }

    private Payment executeCharge(UUID bookingUuid, BigDecimal amount, String method, String idempotencyKey) {
        OffsetDateTime now = OffsetDateTime.now();
        Payment payment = new Payment();
        payment.setUuid(UUID.randomUUID());
        payment.setBookingUuid(bookingUuid);
        payment.setAmount(amount);
        payment.setMethod(normalizeMethod(method));
        payment.setStatus(PaymentStatus.PENDING.name());
        payment.setGatewayProvider(paymentProvider.toUpperCase());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);
        paymentRepository.save(payment);

        PaymentGatewayService.GatewayChargeResult gatewayResult = paymentGatewayService.charge(
                payment.getUuid(), amount, idempotencyKey);

        if (!gatewayResult.success()) {
            payment.setStatus(PaymentStatus.FAILED.name());
            payment.setUpdatedAt(OffsetDateTime.now());
            paymentRepository.save(payment);
            throw new AppException(ErrorCode.BAD_REQUEST,
                    gatewayResult.failureReason() != null
                            ? gatewayResult.failureReason()
                            : "Thanh toán thất bại");
        }

        payment.setStatus(PaymentStatus.COMPLETED.name());
        payment.setGatewayTransactionId(gatewayResult.gatewayTransactionId());
        payment.setPaidAt(now);
        payment.setUpdatedAt(now);
        return paymentRepository.save(payment);
    }

    private String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            return "MOCK";
        }
        return switch (method.toLowerCase()) {
            case "wallet" -> "WALLET";
            case "card" -> "CARD";
            case "momo", "apple" -> method.toUpperCase();
            default -> method.toUpperCase();
        };
    }
}
