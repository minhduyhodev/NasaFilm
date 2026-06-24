package com.thdpv.movietheater.payment.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;

@RestController
@RequestMapping("/api/payments")
public class PaymentWebhookController {

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<Void>> handleWebhook(@RequestBody Map<String, Object> payload) {
        // Gateway callback stub: verify signature, idempotency key, update payment/refund status.
        return ResponseEntity.ok(ApiResponse.success(null, "Webhook received"));
    }
}
