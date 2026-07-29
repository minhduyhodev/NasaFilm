package com.thdpv.movietheater.payment.stripe.application.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;
import com.thdpv.movietheater.payment.service.WalletService;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;

/**
 * Refunds (or wallet-credits) a Stripe booking PaymentIntent that succeeded but was never claimed by a booking.
 * Called from the FE when confirm fails after {@code payment_intent.succeeded}.
 */
@Service
public class CompensateAbandonedPaymentUseCase {

    private static final Logger log = LoggerFactory.getLogger(CompensateAbandonedPaymentUseCase.class);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final StripeGateway stripeGateway;
    private final WalletService walletService;

    public CompensateAbandonedPaymentUseCase(
            PaymentTransactionRepository paymentTransactionRepository,
            StripeGateway stripeGateway,
            WalletService walletService) {
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.stripeGateway = stripeGateway;
        this.walletService = walletService;
    }

    @Transactional
    public String execute(UUID userUuid, String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "paymentIntentId là bắt buộc");
        }
        String intentId = paymentIntentId.trim();
        PaymentTransaction tx = paymentTransactionRepository.findByGatewayTransactionId(intentId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch thanh toán"));

        if (tx.getUserUuid() == null || !tx.getUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Giao dịch không thuộc về bạn");
        }
        if (tx.getPurpose() != null && !WalletService.PURPOSE_BOOKING.equalsIgnoreCase(tx.getPurpose())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ hoàn được giao dịch đặt vé");
        }
        if (tx.getBookingUuid() != null) {
            throw new AppException(ErrorCode.CONFLICT, "Giao dịch đã gắn với đơn đặt vé — dùng luồng hủy/hoàn tiền");
        }
        if ("REFUNDED".equalsIgnoreCase(tx.getStatus()) || "CANCELED".equalsIgnoreCase(tx.getStatus())
                || "CANCELLED".equalsIgnoreCase(tx.getStatus())) {
            return tx.getStatus();
        }

        boolean succeeded = "SUCCESS".equalsIgnoreCase(tx.getStatus());
        if (!succeeded) {
            try {
                PaymentIntentResult pi = stripeGateway.retrievePaymentIntent(intentId);
                succeeded = "succeeded".equalsIgnoreCase(pi.getStatus());
            } catch (RuntimeException ex) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Không xác minh được trạng thái thanh toán Stripe");
            }
        }
        if (!succeeded) {
            tx.setStatus("CANCELED");
            tx.setUpdatedAt(OffsetDateTime.now());
            paymentTransactionRepository.save(tx);
            return "CANCELED";
        }

        BigDecimal amount = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
        long amountVnd = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        String refundId;
        try {
            refundId = stripeGateway.refundPaymentIntent(intentId, amountVnd, "abandon-" + intentId);
        } catch (RuntimeException ex) {
            log.warn("Stripe refund failed for abandoned PI {}; crediting wallet instead: {}", intentId, ex.getMessage());
            if (amountVnd > 0) {
                walletService.creditRefund(userUuid, amount, tx.getUuid(),
                        "Hoàn tiền thanh toán đặt vé không hoàn tất · " + intentId);
            }
            refundId = "WALLET-ABANDON";
        }

        tx.setStatus("REFUNDED");
        tx.setUpdatedAt(OffsetDateTime.now());
        tx.setErrorMessage("Abandoned after confirm failure; refund=" + refundId);
        paymentTransactionRepository.save(tx);
        return "REFUNDED";
    }
}
