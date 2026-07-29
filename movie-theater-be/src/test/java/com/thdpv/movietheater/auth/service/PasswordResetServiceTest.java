package com.thdpv.movietheater.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import io.jsonwebtoken.Claims;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserSessionRepository userSessionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtils jwtUtils;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "frontendUrl", "http://localhost:5173");
    }

    @Test
    void resetPasswordShouldRevokeAllActiveSessions() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("user@test.local");
        user.setPassword("$2a$oldhash");

        Claims claims = mock(Claims.class);
        when(claims.get("purpose", String.class)).thenReturn("RESET_PASSWORD");
        when(claims.getSubject()).thenReturn("user@test.local");
        when(claims.get("pass", String.class)).thenReturn("$2a$oldhash");

        when(jwtUtils.parseResetToken("reset-token")).thenReturn(claims);
        when(userRepository.findByEmailIgnoreCase("user@test.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPass123!")).thenReturn("$2a$newhash");
        when(userSessionRepository.revokeAllActiveSessions(eq(userId), any(LocalDateTime.class))).thenReturn(2);

        passwordResetService.resetPassword("reset-token", "NewPass123!");

        assertEquals("$2a$newhash", user.getPassword());
        verify(userRepository).save(user);
        verify(userSessionRepository).revokeAllActiveSessions(eq(userId), any(LocalDateTime.class));
    }

    @Test
    void resetPasswordShouldRejectReusedToken() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@test.local");
        user.setPassword("$2a$current");

        Claims claims = mock(Claims.class);
        when(claims.get("purpose", String.class)).thenReturn("RESET_PASSWORD");
        when(claims.getSubject()).thenReturn("user@test.local");
        when(claims.get("pass", String.class)).thenReturn("$2a$stale");

        when(jwtUtils.parseResetToken("reset-token")).thenReturn(claims);
        when(userRepository.findByEmailIgnoreCase("user@test.local")).thenReturn(Optional.of(user));

        AppException ex = assertThrows(AppException.class,
                () -> passwordResetService.resetPassword("reset-token", "NewPass123!"));
        assertEquals(ErrorCode.TOKEN_INVALID, ex.getErrorCode());
    }
}
