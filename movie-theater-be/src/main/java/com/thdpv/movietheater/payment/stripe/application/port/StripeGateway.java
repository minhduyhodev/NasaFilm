package com.thdpv.movietheater.payment.stripe.application.port;

import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;

public interface StripeGateway {
    PaymentIntentResult createPaymentIntent(PaymentIntentInput input);
    WebhookResult verifyWebhook(String payload, String signature);
}
