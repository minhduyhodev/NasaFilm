package com.thdpv.movietheater.payment.stripe.application.port;

import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;

public interface StripeGateway {
    PaymentIntentResult createPaymentIntent(PaymentIntentInput input);

    PaymentIntentResult retrievePaymentIntent(String paymentIntentId);

    /**
     * Creates a Stripe Refund against a succeeded PaymentIntent. Returns the refund id (re_...).
     */
    String refundPaymentIntent(String paymentIntentId, long amountVnd, String idempotencyKey);

    WebhookResult verifyWebhook(String payload, String signature);
}
