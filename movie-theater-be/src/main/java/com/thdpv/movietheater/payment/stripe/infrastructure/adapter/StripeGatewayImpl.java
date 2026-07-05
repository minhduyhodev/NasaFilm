package com.thdpv.movietheater.payment.stripe.infrastructure.adapter;

import org.springframework.stereotype.Component;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;
import com.thdpv.movietheater.payment.stripe.infrastructure.config.StripeProperties;

@Component
public class StripeGatewayImpl implements StripeGateway {

    private final StripeProperties properties;

    public StripeGatewayImpl(StripeProperties properties) {
        this.properties = properties;
    }

    @Override
    public PaymentIntentResult createPaymentIntent(PaymentIntentInput input) {
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(input.getAmount())
                    .setCurrency(input.getCurrency())
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);
            return new PaymentIntentResult(paymentIntent.getId(), paymentIntent.getClientSecret(), paymentIntent.getStatus());
        } catch (StripeException e) {
            throw new RuntimeException("Failed to create Stripe PaymentIntent", e);
        }
    }

    @Override
    public WebhookResult verifyWebhook(String payload, String signature) {
        try {
            Event event = Webhook.constructEvent(payload, signature, properties.getWebhookSecret());
            
            String paymentIntentId = null;
            if (event.getDataObjectDeserializer().getObject().isPresent()) {
                com.stripe.model.StripeObject stripeObject = event.getDataObjectDeserializer().getObject().get();
                if (stripeObject instanceof PaymentIntent) {
                    paymentIntentId = ((PaymentIntent) stripeObject).getId();
                }
            }
            
            return new WebhookResult(event.getId(), event.getType(), "RECEIVED", paymentIntentId);
        } catch (SignatureVerificationException e) {
            throw new RuntimeException("Invalid Stripe signature", e);
        } catch (Exception e) {
            throw new RuntimeException("Invalid webhook payload", e);
        }
    }
}
