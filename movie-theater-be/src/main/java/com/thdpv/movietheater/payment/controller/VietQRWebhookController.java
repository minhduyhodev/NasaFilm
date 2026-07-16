package com.thdpv.movietheater.payment.controller;

import java.math.BigDecimal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.dto.SePayWebhookPayload;
import com.thdpv.movietheater.payment.service.VietQRService;


@RestController
public class VietQRWebhookController {

    private static final Logger log = LoggerFactory.getLogger(VietQRWebhookController.class);

    private final VietQRService vietQRService;

    public VietQRWebhookController(VietQRService vietQRService) {
        this.vietQRService = vietQRService;
    }

    @PostMapping("/v1/webhooks/vietqr")
    public ResponseEntity<ApiResponse<Void>> handleVietQRWebhook(
            @RequestBody SePayWebhookPayload payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("Received VietQR Webhook callback. Ref: {}, Amount: {}, Content: {}",
                payload.getReferenceCode(), payload.getAmount(), payload.getContent());

        boolean newlyProcessed = vietQRService.processWebhook(payload, authHeader);

        if (!newlyProcessed) {
            return ResponseEntity.ok(ApiResponse.success(null, "Webhook already processed"));
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Webhook processed successfully"));
    }

    @GetMapping("/api/payments/vietqr/check")
    public ResponseEntity<ApiResponse<Boolean>> checkPaymentStatus(
            @RequestParam("code") String code,
            @RequestParam("amount") BigDecimal amount) {

        if (code == null || code.isBlank() || amount == null) {
            return ResponseEntity.ok(ApiResponse.success(false, "Thông tin kiểm tra không hợp lệ"));
        }

        boolean isReceived = vietQRService.checkPaymentStatus(code, amount);

        return ResponseEntity.ok(ApiResponse.success(
                isReceived,
                isReceived ? "Đã nhận được chuyển khoản" : "Chưa nhận được giao dịch"));
    }
}
