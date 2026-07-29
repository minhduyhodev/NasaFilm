package com.thdpv.movietheater.auth.service;


import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import io.jsonwebtoken.Claims;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            UserSessionRepository userSessionRepository,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtils,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.emailService = emailService;
    }

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElse(null);

        if (user == null) {
            logger.info("[PasswordResetService] Password reset requested for non-existent email: {}", email);
            return;
        }

        if (user.getAuthProvider() == com.thdpv.movietheater.user.enums.AuthProvider.GOOGLE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "GOOGLE_SSO_ACCOUNT");
        }

        String resetToken = jwtUtils.generateResetToken(user.getEmail(), user.getPassword());

        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;

        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);

        logger.info("[PasswordResetService] Password reset link sent to: {}", user.getEmail());
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        try {
            Claims claims = jwtUtils.parseResetToken(token);

            String purpose = claims.get("purpose", String.class);
            if (!"RESET_PASSWORD".equals(purpose)) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Liên kết đặt lại mật khẩu không hợp lệ");
            }

            String email = claims.getSubject();
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Token không chứa email");
            }

            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            String oldPasswordHash = claims.get("pass", String.class);
            if (user.getPassword() == null || !user.getPassword().equals(oldPasswordHash)) {
                throw new AppException(ErrorCode.TOKEN_INVALID,
                        "Liên kết đặt lại mật khẩu đã được sử dụng hoặc đã hết hiệu lực");
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            int revoked = userSessionRepository.revokeAllActiveSessions(user.getId(), LocalDateTime.now());
            logger.info("[PasswordResetService] Password reset successfully for email: {} (revoked {} session(s))",
                    email, revoked);

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            logger.error("[PasswordResetService] Reset token expired: {}", e.getMessage());
            throw new AppException(ErrorCode.TOKEN_EXPIRED, "Liên kết đặt lại mật khẩu đã hết hạn");
        } catch (Exception e) {
            if (e instanceof AppException) {
                throw (AppException) e;
            }
            logger.error("[PasswordResetService] Failed to reset password: {}", e.getMessage());
            throw new AppException(ErrorCode.TOKEN_INVALID, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
        }
    }
}
