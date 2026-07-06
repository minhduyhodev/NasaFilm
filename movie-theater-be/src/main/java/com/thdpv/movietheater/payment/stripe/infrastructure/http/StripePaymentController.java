package com.thdpv.movietheater.payment.stripe.infrastructure.http;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.stripe.application.usecase.CreatePaymentIntentUseCase;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;

@RestController
@RequestMapping("/v1/payments")
public class StripePaymentController {

    private final CreatePaymentIntentUseCase createPaymentIntentUseCase;

    public StripePaymentController(CreatePaymentIntentUseCase createPaymentIntentUseCase) {
        this.createPaymentIntentUseCase = createPaymentIntentUseCase;
    }

    @PostMapping("/payment-intents")
    public ResponseEntity<ApiResponse<PaymentIntentResult>> createPaymentIntent(@RequestBody PaymentIntentInput input) {
        PaymentIntentResult result = createPaymentIntentUseCase.execute(input);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
