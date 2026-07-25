package com.thdpv.movietheater.payment.stripe.infrastructure.http;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.stripe.application.usecase.CreatePaymentIntentUseCase;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@RestController
@RequestMapping("/v1/payments")
public class StripePaymentController {

    private final CreatePaymentIntentUseCase createPaymentIntentUseCase;
    private final UserRepository userRepository;

    public StripePaymentController(CreatePaymentIntentUseCase createPaymentIntentUseCase,
            UserRepository userRepository) {
        this.createPaymentIntentUseCase = createPaymentIntentUseCase;
        this.userRepository = userRepository;
    }

    @PostMapping("/payment-intents")
    public ResponseEntity<ApiResponse<PaymentIntentResult>> createPaymentIntent(
            @RequestBody PaymentIntentInput input,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        UUID userUuid = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        // Bind the payment transaction to the authenticated user server-side; never trust a client-supplied
        // userUuid in the request metadata.
        input.putMetadata("userUuid", userUuid.toString());
        PaymentIntentResult result = createPaymentIntentUseCase.execute(input);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
