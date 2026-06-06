package com.thdpv.movietheater.auth.service;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtils,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.emailService = emailService;
    }

    /**
     * Step 1: User requests password reset. We verify email, generate a stateless reset token, and send email.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Người dùng không tồn tại với email này"));

        // Generate stateless reset token (expires in 15 minutes)
        String resetToken = jwtUtils.generateResetToken(user.getEmail(), user.getPassword());

        // Build reset link
        String resetLink = frontendUrl + "/auth/reset-password?token=" + resetToken;

        // Send email asynchronously
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);

        logger.info("[PasswordResetService] Password reset link sent to: {}", user.getEmail());
    }

    /**
     * Step 2: User submits new password with the token. We parse and verify, and then update password.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        try {
            // Parse token
            Claims claims = jwtUtils.parseResetToken(token);

            // Verify purpose
            String purpose = claims.get("purpose", String.class);
            if (!"RESET_PASSWORD".equals(purpose)) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Liên kết đặt lại mật khẩu không hợp lệ");
            }

            // Verify email
            String email = claims.getSubject();
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Token không chứa email");
            }

            // Get user
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // Verify password state (single-use validation)
            String oldPasswordHash = claims.get("pass", String.class);
            if (user.getPassword() == null || !user.getPassword().equals(oldPasswordHash)) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Liên kết đặt lại mật khẩu đã được sử dụng hoặc đã hết hiệu lực");
            }

            // Update user password
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            logger.info("[PasswordResetService] Password reset successfully for email: {}", email);

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
