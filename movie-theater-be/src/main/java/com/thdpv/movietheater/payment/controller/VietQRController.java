package com.thdpv.movietheater.payment.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.dto.VietQRGenerateRequest;
import com.thdpv.movietheater.payment.dto.VietQRGenerateResponse;
import com.thdpv.movietheater.payment.service.VietQRService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payments/vietqr")
@RequiredArgsConstructor
public class VietQRController {

    private final VietQRService vietQRService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<VietQRGenerateResponse>> generateQR(
            @Valid @RequestBody VietQRGenerateRequest request) {
        VietQRGenerateResponse response = vietQRService.generateQR(
                request.getAmount(),
                request.getDescription());
        return ResponseEntity.ok(ApiResponse.success(response, "Tạo mã QR thành công"));
    }
}
