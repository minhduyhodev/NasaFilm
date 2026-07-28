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
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.PaymentRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final BookingRepository bookingRepository;
    private final WalletService walletService;

    @Value("${app.payment.provider:mock}")
    private String paymentProvider;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentGatewayService paymentGatewayService,
            BookingRepository bookingRepository,
            WalletService walletService) {
        this.paymentRepository = paymentRepository;
        this.paymentGatewayService = paymentGatewayService;
        this.bookingRepository = bookingRepository;
        this.walletService = walletService;
    }

    public String getProviderName() {
        return paymentProvider;
    }

    /**
     * True when the booking payment gateway is the always-succeeds mock
     * (demo/local), not a real provider.
     */
    public boolean isMockProvider() {
        return paymentProvider == null || "mock".equalsIgnoreCase(paymentProvider.trim());
    }

    @Transactional(readOnly = true)
    public java.util.Optional<Payment> findLatestPayment(UUID bookingUuid) {
        if (bookingUuid == null) {
            return java.util.Optional.empty();
        }
        return paymentRepository.findFirstByBookingUuidOrderByCreatedAtDesc(bookingUuid);
    }

    @Transactional(readOnly = true)
    public java.util.Map<UUID, Payment> findLatestPayments(java.util.Collection<UUID> bookingUuids) {
        if (bookingUuids == null || bookingUuids.isEmpty()) {
            return java.util.Map.of();
        }
        return paymentRepository.findLatestByBookingUuidIn(bookingUuids).stream()
                .collect(java.util.stream.Collectors.toMap(Payment::getBookingUuid, p -> p, (a, b) -> a));
    }

    @Transactional
    public Payment chargeBooking(UUID bookingUuid, BigDecimal amount, String method, String idempotencyKey) {
        return chargeBooking(bookingUuid, amount, method, idempotencyKey, null);
    }

    @Transactional
    public Payment chargeBooking(UUID bookingUuid, BigDecimal amount, String method, String idempotencyKey,
            UUID payerUserUuid) {
        if (bookingUuid == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Booking uuid không hợp lệ");
        }
        BigDecimal chargeAmount = amount != null ? amount : BigDecimal.ZERO;
        String key = idempotencyKey != null && !idempotencyKey.isBlank()
                ? idempotencyKey.trim()
                : "pay-" + bookingUuid;

        java.util.Optional<Payment> existing = paymentRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            Payment payment = existing.get();
            if (PaymentStatus.COMPLETED.name().equals(payment.getStatus())) {
                return payment;
            }
            return retryCharge(payment, chargeAmount, method, payerUserUuid);
        }

        return executeCharge(bookingUuid, chargeAmount, method, key, payerUserUuid);
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

    private Payment retryCharge(Payment payment, BigDecimal amount, String method, UUID payerUserUuid) {
        if (PaymentStatus.COMPLETED.name().equals(payment.getStatus())) {
            return payment;
        }
        payment.setAmount(amount);
        payment.setMethod(normalizeMethod(method));
        payment.setStatus(PaymentStatus.PENDING.name());
        payment.setUpdatedAt(OffsetDateTime.now());
        paymentRepository.save(payment);
        return completeCharge(payment, payerUserUuid);
    }

    private Payment executeCharge(UUID bookingUuid, BigDecimal amount, String method, String idempotencyKey,
            UUID payerUserUuid) {
        OffsetDateTime now = OffsetDateTime.now();
        String normalizedMethod = normalizeMethod(method);

        Payment payment = new Payment();
        payment.setUuid(UUID.randomUUID());
        payment.setBookingUuid(bookingUuid);
        payment.setAmount(amount);
        payment.setMethod(normalizedMethod);
        payment.setStatus(PaymentStatus.PENDING.name());
        payment.setGatewayProvider(paymentProvider.toUpperCase());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setCreatedAt(now);
        payment.setUpdatedAt(now);
        paymentRepository.save(payment);

        return completeCharge(payment, payerUserUuid);
    }

    private Payment completeCharge(Payment payment, UUID payerUserUuid) {
        OffsetDateTime now = OffsetDateTime.now();
        String normalizedMethod = payment.getMethod();

        if (isCounterMethod(normalizedMethod)) {
            payment.setStatus(PaymentStatus.COMPLETED.name());
            payment.setGatewayProvider("COUNTER");
            payment.setGatewayTransactionId(buildCounterTransactionId(normalizedMethod, payment.getUuid()));
            payment.setPaidAt(now);
            payment.setUpdatedAt(now);
            return paymentRepository.save(payment);
        }

        if ("WALLET".equals(normalizedMethod)) {
            UUID userUuid = payerUserUuid;
            if (userUuid == null) {
                userUuid = bookingRepository.findById(payment.getBookingUuid())
                        .map(Booking::getUserUuid)
                        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
            }
            walletService.debitForPayment(
                    userUuid,
                    payment.getAmount(),
                    payment.getUuid(),
                    "Thanh toán đặt vé");
            payment.setStatus(PaymentStatus.COMPLETED.name());
            payment.setGatewayTransactionId("WALLET-" + payment.getUuid().toString().substring(0, 8).toUpperCase());
            payment.setPaidAt(now);
            payment.setUpdatedAt(now);
            return paymentRepository.save(payment);
        }

        if ("VIETQR".equals(normalizedMethod)) {
            payment.setStatus(PaymentStatus.COMPLETED.name());
            payment.setGatewayProvider("VIETQR");
            payment.setGatewayTransactionId("VIETQR-" + payment.getUuid().toString().substring(0, 8).toUpperCase());
            payment.setPaidAt(now);
            payment.setUpdatedAt(now);
            return paymentRepository.save(payment);
        }

        PaymentGatewayService.GatewayChargeResult gatewayResult = paymentGatewayService.charge(
                payment.getUuid(), payment.getAmount(), payment.getIdempotencyKey());

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

    private boolean isCounterMethod(String method) {
        return "COUNTER_CASH".equals(method)
                || "COUNTER_CARD".equals(method)
                || "COUNTER_VIETQR".equals(method);
    }

    private String buildCounterTransactionId(String method, UUID paymentUuid) {
        String suffix = paymentUuid.toString().substring(0, 8).toUpperCase();
        return switch (method) {
            case "COUNTER_CASH" -> "COUNTER-CASH-" + suffix;
            case "COUNTER_CARD" -> "COUNTER-CARD-" + suffix;
            case "COUNTER_VIETQR" -> "COUNTER-VIETQR-" + suffix;
            default -> "COUNTER-" + suffix;
        };
    }

    private String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            return "MOCK";
        }
        return switch (method.toLowerCase()) {
            case "wallet" -> "WALLET";
            case "card" -> "CARD";
            case "vietqr" -> "VIETQR";
            case "momo", "apple" -> method.toUpperCase();
            default -> method.toUpperCase();
        };
    }
}
