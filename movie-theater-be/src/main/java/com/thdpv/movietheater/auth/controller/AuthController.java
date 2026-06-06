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
import com.thdpv.movietheater.auth.dto.ForgotPasswordRequest;
import com.thdpv.movietheater.auth.dto.ResetPasswordRequest;
import com.thdpv.movietheater.auth.service.AuthService;
import com.thdpv.movietheater.auth.service.PasswordResetService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(loginRequest)));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<JwtResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest googleLoginRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.loginWithGoogle(googleLoginRequest)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<JwtResponse>> refresh(@Valid @RequestBody TokenRefreshRequest refreshRequest) {
        return ResponseEntity.ok(ApiResponse.success(authService.refreshToken(refreshRequest)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) TokenRefreshRequest refreshRequest) {
        authService.logout(refreshRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Dang xuat thanh cong"));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Ma xac thuc da duoc gui qua email"));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResponse<Void>> verifyRegister(@Valid @RequestBody VerifyRequest verifyRequest) {
        authService.verifyRegister(verifyRequest);
        return ResponseEntity.ok(ApiResponse.success(null, "Xac thuc dang ky thanh cong"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null, "Ma dat lai mat khau da duoc gui qua email"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Mat khau da duoc cap nhat thanh cong"));
    }
}
