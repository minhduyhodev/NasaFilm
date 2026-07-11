package com.thdpv.movietheater.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.auth.dto.GoogleLoginRequest;
import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.dto.LoginRequest;
import com.thdpv.movietheater.auth.dto.TokenRefreshRequest;
import com.thdpv.movietheater.auth.dto.RegisterRequest;
import com.thdpv.movietheater.auth.dto.VerifyRequest;
import com.thdpv.movietheater.auth.dto.ActivateAccountRequest;
import com.thdpv.movietheater.auth.dto.ForgotPasswordRequest;
import com.thdpv.movietheater.auth.dto.ResetPasswordRequest;
import com.thdpv.movietheater.auth.service.AccountActivationService;
import com.thdpv.movietheater.auth.service.AuthService;
import com.thdpv.movietheater.auth.service.PasswordResetService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AccountActivationService accountActivationService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
            AccountActivationService accountActivationService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.accountActivationService = accountActivationService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(loginRequest, httpServletRequest)));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<JwtResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest googleLoginRequest,
            HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.loginWithGoogle(googleLoginRequest, httpServletRequest)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<JwtResponse>> refresh(
            @Valid @RequestBody TokenRefreshRequest refreshRequest,
            HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.refreshToken(refreshRequest, httpServletRequest)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) TokenRefreshRequest refreshRequest) {
        authService.logout(refreshRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Dang xuat thanh cong"));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequest registerRequest,
            HttpServletRequest httpServletRequest) {
        authService.register(registerRequest, httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Ma xac thuc da duoc gui qua email"));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResponse<Void>> verifyRegister(
            @Valid @RequestBody VerifyRequest verifyRequest,
            HttpServletRequest httpServletRequest) {
        authService.verifyRegister(verifyRequest, httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Xác thực đăng ký thành công"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null, "Mã đặt lại mật khẩu đã được gửi qua email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Mật khẩu đã được cập nhật thành công"));
    }

    @PostMapping("/activate-account")
    public ResponseEntity<ApiResponse<Void>> activateAccount(@Valid @RequestBody ActivateAccountRequest request) {
        accountActivationService.activateAccount(
                request.getToken(), request.getTemporaryPassword(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Kích hoạt tài khoản thành công"));
    }
}
