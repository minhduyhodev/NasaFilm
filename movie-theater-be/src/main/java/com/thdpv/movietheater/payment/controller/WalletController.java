package com.thdpv.movietheater.payment.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.payment.dto.VietQRGenerateResponse;
import com.thdpv.movietheater.payment.dto.WalletAmountRequest;
import com.thdpv.movietheater.payment.dto.WalletSummaryResponse;
import com.thdpv.movietheater.payment.dto.WalletTopUpConfirmRequest;
import com.thdpv.movietheater.payment.dto.WalletTopUpIntentResponse;
import com.thdpv.movietheater.payment.dto.WalletTransactionResponse;
import com.thdpv.movietheater.payment.service.WalletService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<WalletSummaryResponse>> getWallet(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userUuid = resolveUserUuid(userDetails);
        return ResponseEntity.ok(ApiResponse.success(walletService.getSummary(userUuid)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<WalletTransactionResponse>>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userUuid = resolveUserUuid(userDetails);
        return ResponseEntity.ok(ApiResponse.success(walletService.getRecentTransactions(userUuid)));
    }

    @PostMapping("/top-up")
    public ResponseEntity<ApiResponse<WalletSummaryResponse>> topUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WalletAmountRequest request) {
        UUID userUuid = resolveUserUuid(userDetails);
        WalletSummaryResponse summary = walletService.mockTopUp(userUuid, request.getAmount());
        return ResponseEntity.ok(ApiResponse.success(summary, "Nạp tiền mô phỏng thành công"));
    }

    @PostMapping("/top-up/intent")
    public ResponseEntity<ApiResponse<WalletTopUpIntentResponse>> createTopUpIntent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WalletAmountRequest request) {
        UUID userUuid = resolveUserUuid(userDetails);
        WalletTopUpIntentResponse intent = walletService.createTopUpIntent(userUuid, request.getAmount());
        String message = intent.isMockMode()
                ? "Nạp tiền mô phỏng thành công"
                : "Đã tạo phiên thanh toán nạp ví";
        return ResponseEntity.ok(ApiResponse.success(intent, message));
    }

    @PostMapping("/top-up/confirm")
    public ResponseEntity<ApiResponse<WalletSummaryResponse>> confirmTopUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WalletTopUpConfirmRequest request) {
        UUID userUuid = resolveUserUuid(userDetails);
        WalletSummaryResponse summary = walletService.confirmTopUp(userUuid, request.getPaymentIntentId());
        return ResponseEntity.ok(ApiResponse.success(summary, "Nạp tiền thành công"));
    }

    @PostMapping("/top-up/vietqr")
    public ResponseEntity<ApiResponse<VietQRGenerateResponse>> createVietQRTopUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WalletAmountRequest request) {
        UUID userUuid = resolveUserUuid(userDetails);
        VietQRGenerateResponse qrData = walletService.createVietQRTopUp(userUuid, request.getAmount());
        return ResponseEntity.ok(ApiResponse.success(qrData, "Tạo mã QR nạp ví thành công"));
    }

    @GetMapping("/top-up/vietqr/check")
    public ResponseEntity<ApiResponse<WalletSummaryResponse>> checkVietQRTopUp(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String code,
            @RequestParam BigDecimal amount) {
        UUID userUuid = resolveUserUuid(userDetails);
        WalletSummaryResponse summary = walletService.checkAndCreditVietQRTopUp(userUuid, code, amount);
        if (summary == null) {
            // Chưa nhận được thanh toán — FE tiếp tục polling
            return ResponseEntity.ok(ApiResponse.success(null, "Chưa nhận được thanh toán"));
        }
        return ResponseEntity.ok(ApiResponse.success(summary, "Nạp tiền qua VietQR thành công"));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<ApiResponse<WalletSummaryResponse>> withdraw(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WalletAmountRequest request) {
        UUID userUuid = resolveUserUuid(userDetails);
        WalletSummaryResponse summary = walletService.mockWithdraw(userUuid, request.getAmount());
        return ResponseEntity.ok(ApiResponse.success(summary, "Rút tiền mô phỏng thành công"));
    }

    private UUID resolveUserUuid(UserDetails userDetails) {
        if (userDetails == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        return user.getId();
    }
}
