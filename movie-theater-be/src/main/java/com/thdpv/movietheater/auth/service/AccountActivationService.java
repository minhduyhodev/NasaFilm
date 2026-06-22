package com.thdpv.movietheater.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

import io.jsonwebtoken.Claims;

@Service
public class AccountActivationService {

    private static final Logger logger = LoggerFactory.getLogger(AccountActivationService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AccountActivationService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @Transactional
    public void activateAccount(String token, String temporaryPassword, String newPassword) {
        try {
            Claims claims = jwtUtils.parseResetToken(token);

            String purpose = claims.get("purpose", String.class);
            if (!"ACTIVATE_ACCOUNT".equals(purpose)) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Liên kết kích hoạt tài khoản không hợp lệ");
            }

            String email = claims.getSubject();
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.TOKEN_INVALID, "Token không chứa email");
            }

            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            if (user.getStatus() == UserStatus.ACTIVE) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Tài khoản đã được kích hoạt trước đó");
            }

            String oldPasswordHash = claims.get("pass", String.class);
            if (user.getPassword() == null || !user.getPassword().equals(oldPasswordHash)) {
                throw new AppException(ErrorCode.TOKEN_INVALID,
                        "Liên kết kích hoạt đã được sử dụng hoặc đã hết hiệu lực");
            }

            if (!passwordEncoder.matches(temporaryPassword, user.getPassword())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mật khẩu tạm thời không đúng");
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            user.setStatus(UserStatus.ACTIVE);
            userRepository.save(user);

            logger.info("[AccountActivationService] Account activated for email: {}", email);

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            logger.error("[AccountActivationService] Activation token expired: {}", e.getMessage());
            throw new AppException(ErrorCode.TOKEN_EXPIRED, "Liên kết kích hoạt tài khoản đã hết hạn");
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            logger.error("[AccountActivationService] Failed to activate account: {}", e.getMessage());
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "Liên kết kích hoạt tài khoản không hợp lệ hoặc đã hết hạn");
        }
    }
}
