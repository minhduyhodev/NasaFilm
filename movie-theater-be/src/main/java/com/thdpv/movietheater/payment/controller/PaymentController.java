package com.thdpv.movietheater.payment.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPaymentConfig() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "provider", paymentService.getProviderName(),
                "mode", "mock".equalsIgnoreCase(paymentService.getProviderName()) ? "sandbox" : "live")));
    }
}
