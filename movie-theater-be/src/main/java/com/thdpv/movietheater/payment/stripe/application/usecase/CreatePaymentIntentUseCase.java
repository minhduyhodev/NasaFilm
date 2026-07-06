package com.thdpv.movietheater.payment.stripe.application.usecase;

import org.springframework.stereotype.Service;

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

    private final StripeGateway stripeGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;

    public CreatePaymentIntentUseCase(StripeGateway stripeGateway, PaymentTransactionRepository paymentTransactionRepository) {
        this.stripeGateway = stripeGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    public PaymentIntentResult execute(PaymentIntentInput input) {
        if (input.getAmount() == null || input.getAmount() <= 0) {
            throw new IllegalArgumentException("amount must be a positive integer");
        }
        if (input.getCurrency() == null || input.getCurrency().isEmpty()) {
            throw new IllegalArgumentException("currency is required");
        }
        PaymentIntentResult result = stripeGateway.createPaymentIntent(input);
        
        // Save to Database
        PaymentTransaction tx = new PaymentTransaction();
        tx.setUuid(UUID.randomUUID());
        tx.setPaymentGateway("STRIPE");
        tx.setGatewayTransactionId(result.getId());
        tx.setAmount(BigDecimal.valueOf(input.getAmount()));
        tx.setCurrency(input.getCurrency().toUpperCase());
        tx.setStatus("PENDING");
        tx.setCreatedAt(OffsetDateTime.now());
        tx.setUpdatedAt(OffsetDateTime.now());
        
        paymentTransactionRepository.save(tx);
        
        return result;
    }
}
