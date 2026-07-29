package com.thdpv.movietheater.payment.stripe.application.usecase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;
import com.thdpv.movietheater.payment.service.WalletService;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;

@ExtendWith(MockitoExtension.class)
class HandleStripeWebhookUseCaseTest {

    @Mock
    private StripeGateway stripeGateway;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private WalletService walletService;

    private HandleStripeWebhookUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new HandleStripeWebhookUseCase(stripeGateway, paymentTransactionRepository, walletService);
    }

    @Test
    void succeededShouldNotOverwriteRefundedTransaction() {
        WebhookResult result = new WebhookResult();
        result.setType("payment_intent.succeeded");
        result.setPaymentIntentId("pi_refunded");

        PaymentTransaction tx = new PaymentTransaction();
        tx.setGatewayTransactionId("pi_refunded");
        tx.setPurpose("BOOKING");
        tx.setStatus("REFUNDED");

        when(stripeGateway.verifyWebhook("payload", "sig")).thenReturn(result);
        when(paymentTransactionRepository.findByGatewayTransactionId("pi_refunded"))
                .thenReturn(Optional.of(tx));

        useCase.execute("payload", "sig");

        assertEquals("REFUNDED", tx.getStatus());
        verify(paymentTransactionRepository, never()).save(any());
    }

    @Test
    void succeededShouldMarkPendingAsSuccess() {
        WebhookResult result = new WebhookResult();
        result.setType("payment_intent.succeeded");
        result.setPaymentIntentId("pi_ok");

        PaymentTransaction tx = new PaymentTransaction();
        tx.setGatewayTransactionId("pi_ok");
        tx.setPurpose("BOOKING");
        tx.setStatus("PENDING");

        when(stripeGateway.verifyWebhook("payload", "sig")).thenReturn(result);
        when(paymentTransactionRepository.findByGatewayTransactionId("pi_ok"))
                .thenReturn(Optional.of(tx));

        useCase.execute("payload", "sig");

        ArgumentCaptor<PaymentTransaction> captor = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(paymentTransactionRepository).save(captor.capture());
        assertEquals("SUCCESS", captor.getValue().getStatus());
    }
}
