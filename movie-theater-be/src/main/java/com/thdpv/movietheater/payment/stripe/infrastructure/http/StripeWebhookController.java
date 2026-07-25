package com.thdpv.movietheater.payment.stripe.infrastructure.http;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.stripe.application.usecase.HandleStripeWebhookUseCase;
import com.thdpv.movietheater.payment.stripe.domain.WebhookResult;

@RestController
@RequestMapping("/v1/webhooks")
public class StripeWebhookController {

    private final HandleStripeWebhookUseCase handleStripeWebhookUseCase;

    public StripeWebhookController(HandleStripeWebhookUseCase handleStripeWebhookUseCase) {
        this.handleStripeWebhookUseCase = handleStripeWebhookUseCase;
    }

    @PostMapping("/stripe")
    public ResponseEntity<ApiResponse<WebhookResult>> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {

        WebhookResult result = handleStripeWebhookUseCase.execute(payload, signature);

        return ResponseEntity.ok(ApiResponse.success(result, "Webhook handled"));
    }
}
