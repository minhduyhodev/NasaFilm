package com.thdpv.movietheater.payment.stripe.application.usecase;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;
import com.thdpv.movietheater.payment.service.WalletService;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class HandleStripeWebhookUseCase {

    private final StripeGateway stripeGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final WalletService walletService;

    public HandleStripeWebhookUseCase(
            StripeGateway stripeGateway,
            PaymentTransactionRepository paymentTransactionRepository,
            WalletService walletService) {
        this.stripeGateway = stripeGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.walletService = walletService;
    }

    public WebhookResult execute(String payload, String signature) {
        if (signature == null || signature.isEmpty()) {
            throw new IllegalArgumentException("stripe-signature header is required");
        }
        WebhookResult result = stripeGateway.verifyWebhook(payload, signature);

        if (result.getType().startsWith("payment_intent.") && result.getPaymentIntentId() != null) {
            Optional<PaymentTransaction> txOpt =
                    paymentTransactionRepository.findByGatewayTransactionId(result.getPaymentIntentId());
            if (txOpt.isPresent()) {
                PaymentTransaction tx = txOpt.get();
                if ("payment_intent.succeeded".equals(result.getType())) {
                    if (WalletService.PURPOSE_WALLET_TOP_UP.equals(tx.getPurpose())) {
                        walletService.creditSuccessfulStripeTopUp(result.getPaymentIntentId());
                    } else if (!isTerminalPaymentStatus(tx.getStatus())) {
                        // Do not resurrect REFUNDED/CANCELED after abandon/compensate.
                        tx.setStatus("SUCCESS");
                        tx.setUpdatedAt(OffsetDateTime.now());
                        paymentTransactionRepository.save(tx);
                    }
                } else if ("payment_intent.payment_failed".equals(result.getType())) {
                    if (!isTerminalPaymentStatus(tx.getStatus()) && !"SUCCESS".equalsIgnoreCase(tx.getStatus())) {
                        tx.setStatus("FAILED");
                        tx.setUpdatedAt(OffsetDateTime.now());
                        paymentTransactionRepository.save(tx);
                    }
                } else if ("payment_intent.canceled".equals(result.getType())) {
                    if (!isTerminalPaymentStatus(tx.getStatus()) && !"SUCCESS".equalsIgnoreCase(tx.getStatus())) {
                        tx.setStatus("CANCELED");
                        tx.setUpdatedAt(OffsetDateTime.now());
                        paymentTransactionRepository.save(tx);
                    }
                }
            }
        }

        return result;
    }

    private static boolean isTerminalPaymentStatus(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        return "REFUNDED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status);
    }
}
