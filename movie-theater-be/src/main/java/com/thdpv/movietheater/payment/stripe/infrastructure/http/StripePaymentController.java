package com.thdpv.movietheater.payment.stripe.infrastructure.http;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.dto.CreateBookingPaymentIntentRequest;
import com.thdpv.movietheater.payment.stripe.application.usecase.CompensateAbandonedPaymentUseCase;
import com.thdpv.movietheater.payment.stripe.application.usecase.CreatePaymentIntentUseCase;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@RestController
@RequestMapping("/v1/payments")
public class StripePaymentController {

    private final CreatePaymentIntentUseCase createPaymentIntentUseCase;
    private final CompensateAbandonedPaymentUseCase compensateAbandonedPaymentUseCase;
    private final UserRepository userRepository;
    private final BookingService bookingService;

    public StripePaymentController(
            CreatePaymentIntentUseCase createPaymentIntentUseCase,
            CompensateAbandonedPaymentUseCase compensateAbandonedPaymentUseCase,
            UserRepository userRepository,
            BookingService bookingService) {
        this.createPaymentIntentUseCase = createPaymentIntentUseCase;
        this.compensateAbandonedPaymentUseCase = compensateAbandonedPaymentUseCase;
        this.userRepository = userRepository;
        this.bookingService = bookingService;
    }

    /**
     * Creates a Stripe PaymentIntent for booking checkout. Amount is always computed server-side from
     * seats / VOD price (+ promo / loyalty). Client-supplied amounts are ignored.
     */
    @PostMapping("/payment-intents")
    public ResponseEntity<ApiResponse<PaymentIntentResult>> createPaymentIntent(
            @RequestBody CreateBookingPaymentIntentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userUuid = requireUserUuid(userDetails);

        BigDecimal quoted = bookingService.quoteCheckoutTotal(userUuid, request);
        long amountVnd = quoted.setScale(0, RoundingMode.HALF_UP).longValueExact();
        if (amountVnd <= 0) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Số tiền sau giảm giá bằng 0. Vui lòng xác nhận đặt vé miễn phí (không dùng thẻ).");
        }

        PaymentIntentInput input = new PaymentIntentInput(amountVnd,
                request.getCurrency() != null ? request.getCurrency() : "vnd");
        input.putMetadata("userUuid", userUuid.toString());
        if (request.getMovieUuid() != null) {
            input.putMetadata("movieUuid", request.getMovieUuid().toString());
        }
        if (request.getShowtimeUuid() != null) {
            input.putMetadata("showtimeUuid", request.getShowtimeUuid().toString());
        }

        PaymentIntentResult result = createPaymentIntentUseCase.execute(input);
        result.setAmount(amountVnd);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Compensates a succeeded Stripe PI that never became a booking (confirm failed after charge).
     */
    @PostMapping("/payment-intents/{paymentIntentId}/abandon")
    public ResponseEntity<ApiResponse<Map<String, String>>> abandonPaymentIntent(
            @PathVariable String paymentIntentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userUuid = requireUserUuid(userDetails);
        String status = compensateAbandonedPaymentUseCase.execute(userUuid, paymentIntentId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("status", status), "Đã xử lý hoàn tiền giao dịch"));
    }

    private UUID requireUserUuid(UserDetails userDetails) {
        if (userDetails == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }
}
