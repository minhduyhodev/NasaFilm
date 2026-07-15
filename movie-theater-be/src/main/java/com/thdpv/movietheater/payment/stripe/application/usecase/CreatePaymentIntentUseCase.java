package com.thdpv.movietheater.payment.stripe.application.usecase;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.payment.service.WalletService;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class CreatePaymentIntentUseCase {

    /** Hard ceiling for a single card payment intent (VND). Guards against absurd/overflow amounts. */
    private static final long MAX_INTENT_AMOUNT = 100_000_000L;

    private final StripeGateway stripeGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;

    public CreatePaymentIntentUseCase(StripeGateway stripeGateway, PaymentTransactionRepository paymentTransactionRepository) {
        this.stripeGateway = stripeGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    public PaymentIntentResult execute(PaymentIntentInput input) {
        if (input.getAmount() == null || input.getAmount() <= 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền thanh toán không hợp lệ");
        }
        if (input.getAmount() > MAX_INTENT_AMOUNT) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền vượt quá giới hạn cho phép");
        }
        String currency = input.getCurrency() == null ? null : input.getCurrency().trim().toLowerCase();
        if (!"vnd".equals(currency)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ hỗ trợ đơn vị tiền VND");
        }
        input.setCurrency(currency);
        // This endpoint only issues intents for booking card payments. Force the purpose so a client cannot
        // set purpose=WALLET_TOP_UP and have the webhook credit a wallet, bypassing the validated wallet
        // top-up flow (min/max bounds live in WalletService.createTopUpIntent).
        input.putMetadata("purpose", WalletService.PURPOSE_BOOKING);
        PaymentIntentResult result = stripeGateway.createPaymentIntent(input);
        
        // Save to Database
        PaymentTransaction tx = new PaymentTransaction();
        tx.setUuid(UUID.randomUUID());
        tx.setPaymentGateway("STRIPE");
        tx.setGatewayTransactionId(result.getId());
        tx.setAmount(BigDecimal.valueOf(input.getAmount()));
        tx.setCurrency(input.getCurrency().toUpperCase());
        tx.setStatus("PENDING");
        String purpose = input.getMetadata() != null ? input.getMetadata().get("purpose") : null;
        tx.setPurpose(purpose != null && !purpose.isBlank() ? purpose : "BOOKING");
        if (input.getMetadata() != null && input.getMetadata().get("userUuid") != null) {
            try {
                tx.setUserUuid(UUID.fromString(input.getMetadata().get("userUuid")));
            } catch (IllegalArgumentException ignored) {
                // optional metadata
            }
        }
        if (input.getMetadata() != null && input.getMetadata().get("bookingUuid") != null) {
            try {
                tx.setBookingUuid(UUID.fromString(input.getMetadata().get("bookingUuid")));
            } catch (IllegalArgumentException ignored) {
                // optional metadata
            }
        }
        tx.setCreatedAt(OffsetDateTime.now());
        tx.setUpdatedAt(OffsetDateTime.now());

        paymentTransactionRepository.save(tx);
        
        return result;
    }
}
