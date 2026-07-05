package com.thdpv.movietheater.payment.stripe.application.usecase;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class HandleStripeWebhookUseCase {

    private final StripeGateway stripeGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;

    public HandleStripeWebhookUseCase(StripeGateway stripeGateway, PaymentTransactionRepository paymentTransactionRepository) {
        this.stripeGateway = stripeGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    public WebhookResult execute(String payload, String signature) {
        if (signature == null || signature.isEmpty()) {
            throw new IllegalArgumentException("stripe-signature header is required");
        }
        WebhookResult result = stripeGateway.verifyWebhook(payload, signature);
        
        // Update database if it's a payment event
        if (result.getType().startsWith("payment_intent.")) {
            Optional<PaymentTransaction> txOpt = paymentTransactionRepository.findByGatewayTransactionId(result.getPaymentIntentId());
            if (txOpt.isPresent()) {
                PaymentTransaction tx = txOpt.get();
                if ("payment_intent.succeeded".equals(result.getType())) {
                    tx.setStatus("SUCCESS");
                } else if ("payment_intent.payment_failed".equals(result.getType())) {
                    tx.setStatus("FAILED");
                } else if ("payment_intent.canceled".equals(result.getType())) {
                    tx.setStatus("REFUNDED");
                }
                tx.setUpdatedAt(OffsetDateTime.now());
                paymentTransactionRepository.save(tx);
            }
        }
        
        return result;
    }
}
