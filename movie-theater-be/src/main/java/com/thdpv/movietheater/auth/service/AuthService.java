package com.thdpv.movietheater.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.dto.LoginRequest;
import com.thdpv.movietheater.auth.dto.TokenRefreshRequest;
import com.thdpv.movietheater.auth.entity.UserSession;
import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.security.JwtUtils;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtUtils jwtUtils,
            UserSessionRepository userSessionRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userSessionRepository = userSessionRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public JwtResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String accessToken = jwtUtils.generateToken(userDetails.getUsername());

        // Tìm User để tạo session
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Tạo Refresh Token
        String refreshToken = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);

        // Lưu phiên làm việc vào DB
        UserSession userSession = new UserSession(user, refreshToken, expiryDate, null, null);
        userSessionRepository.save(userSession);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return new JwtResponse(accessToken, refreshToken, userDetails.getUsername(), roles, user.getId(),
                user.getFullName());
    }

    @Transactional
    public JwtResponse refreshToken(TokenRefreshRequest request) {
        String token = request.getRefreshToken();
        UserSession session = userSessionRepository.findByRefreshToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID));

        if (session.isRevoked()) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }

        if (session.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        }

        // Xoay vòng Refresh Token (Token Rotation)
        String newRefreshToken = UUID.randomUUID().toString();
        LocalDateTime newExpiryDate = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);

        session.setRefreshToken(newRefreshToken);
        session.setExpiryDate(newExpiryDate);
        userSessionRepository.save(session);

        // Tạo Access Token mới
        String newAccessToken = jwtUtils.generateToken(session.getUser().getEmail());

        // Lấy danh sách Roles
        List<UserRole> userRoles = userRoleRepository.findByUserId(session.getUser().getId());
        List<String> roles = userRoles.stream()
                .map(ur -> "ROLE_" + ur.getRole().getName().name())
                .toList();

        return new JwtResponse(newAccessToken, newRefreshToken, session.getUser().getEmail(), roles,
                session.getUser().getId(), session.getUser().getFullName());
    }

    @Transactional
    public void logout(TokenRefreshRequest request) {
        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            userSessionRepository.findByRefreshToken(request.getRefreshToken())
                    .ifPresent(session -> {
                        session.setRevoked(true);
                        userSessionRepository.save(session);
                    });
        }
        SecurityContextHolder.clearContext();
    }
}
