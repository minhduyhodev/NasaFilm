package com.thdpv.movietheater.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.thdpv.movietheater.auth.dto.GoogleLoginRequest;
import com.thdpv.movietheater.auth.dto.LoginRequest;
import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.entity.UserSession;
import com.thdpv.movietheater.auth.repository.RolePermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.auth.repository.UserPermissionRepository;
import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.auth.util.RefreshTokenHasher;
import com.thdpv.movietheater.auth.support.AuthActionRateLimiter;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.auth.dto.TokenRefreshRequest;
import com.thdpv.movietheater.auth.dto.VerifyRequest;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import java.time.LocalDateTime;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserSessionRepository userSessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    @Mock
    private UserPermissionRepository userPermissionRepository;

    @Mock
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private AuthActionRateLimiter authActionRateLimiter;

    @Mock
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                jwtUtils,
                userSessionRepository,
                userRepository,
                userRoleRepository,
                rolePermissionRepository,
                userPermissionRepository,
                googleIdTokenVerifier,
                passwordEncoder,
                emailService,
                roleRepository,
                authActionRateLimiter,
                redisTemplate);

        ReflectionTestUtils.setField(authService, "refreshTokenExpirationMs", 86400000L);
        ReflectionTestUtils.setField(authService, "googleClientId", "google-client-id");
    }

    @Test
    void loginWithGoogleShouldReturnAvatarUrlFromGoogleProfile() throws Exception {
        String email = "astronaut@example.com";
        String fullName = "Neil Avatar";
        String avatarUrl = "https://lh3.googleusercontent.com/a/avatar";
        UUID userId = UUID.randomUUID();

        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("valid-google-token");

        Role customerRole = new Role();
        customerRole.setName(RoleName.CUSTOMER);

        when(googleIdTokenVerifier.verify("valid-google-token"))
                .thenReturn(createGoogleIdToken(email, fullName, avatarUrl, true));
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.empty());
        when(roleRepository.findByName(RoleName.CUSTOMER)).thenReturn(Optional.of(customerRole));
        when(jwtUtils.generateToken(email)).thenReturn("generated-access-token");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) {
                user.setId(userId);
            }
            return user;
        });
        when(userRoleRepository.save(any(UserRole.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findByUserId(userId)).thenAnswer(invocation -> {
            UserRole userRole = new UserRole();
            userRole.setRole(customerRole);
            return List.of(userRole);
        });
        when(userSessionRepository.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockHttpServletRequest httpServletRequest = new MockHttpServletRequest();
        httpServletRequest.addHeader("User-Agent", "JUnit");
        httpServletRequest.setRemoteAddr("127.0.0.1");

        JwtResponse response = authService.loginWithGoogle(request, httpServletRequest);

        assertEquals(email, response.getEmail());
        assertEquals(fullName, response.getFullName());
        assertEquals(avatarUrl, response.getAvatarUrl());
        assertEquals(List.of("CUSTOMER"), response.getRoles());
        assertEquals("generated-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertSame(savedUser.getId(), response.getUserId());
        assertEquals(avatarUrl, savedUser.getAvatarUrl());
        assertEquals(fullName, savedUser.getFullName());
        assertEquals(AuthProvider.GOOGLE, savedUser.getAuthProvider());
        assertEquals(UserStatus.ACTIVE, savedUser.getStatus());

        ArgumentCaptor<UserSession> sessionCaptor = ArgumentCaptor.forClass(UserSession.class);
        verify(userSessionRepository).save(sessionCaptor.capture());
        UserSession savedSession = sessionCaptor.getValue();
        assertEquals(userId, savedSession.getUserId());
        assertEquals("ACTIVE", savedSession.getStatus());
        assertEquals("JUnit", savedSession.getUserAgent());
        assertEquals("127.0.0.1", savedSession.getIpAddress());
        assertEquals(RefreshTokenHasher.hash(response.getRefreshToken()), savedSession.getRefreshTokenHash());
    }

    private GoogleIdToken createGoogleIdToken(String email, String fullName, String avatarUrl, boolean emailVerified) {
        Payload payload = new Payload();
        payload.setEmail(email);
        payload.setEmailVerified(emailVerified);
        payload.put("name", fullName);
        payload.put("picture", avatarUrl);

        return new GoogleIdToken(new JsonWebSignature.Header(), payload, new byte[0], new byte[0]);
    }

    @Test
    void verifyRegisterShouldIncrementAttemptsOnInvalidCode() {
        String email = "test@example.com";
        VerifyRequest request = new VerifyRequest();
        request.setEmail(email);
        request.setCode("wrong-code");

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        user.setVerificationCode("123456");
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));
        user.setVerificationAttempts(0);

        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class, () -> {
            authService.verifyRegister(request, new MockHttpServletRequest());
        });

        assertEquals(ErrorCode.VERIFICATION_CODE_INVALID, exception.getErrorCode());
        assertEquals(1, user.getVerificationAttempts());
    }

    @Test
    void verifyRegisterShouldLockAccountOnTooManyAttempts() {
        String email = "test@example.com";
        VerifyRequest request = new VerifyRequest();
        request.setEmail(email);
        request.setCode("wrong-code");

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        user.setVerificationCode("123456");
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));
        user.setVerificationAttempts(9);

        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class, () -> {
            authService.verifyRegister(request, new MockHttpServletRequest());
        });

        assertEquals(ErrorCode.VERIFICATION_CODE_INVALID, exception.getErrorCode());
        assertEquals(0, user.getVerificationAttempts());
        assertNotNull(user.getVerificationLockTime());
    }

    @Test
    void loginShouldThrowExceptionWhenUserIsBanned() {
        String email = "banned@example.com";
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword("password");

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.BANNED);

        org.springframework.security.core.userdetails.User principal = 
            new org.springframework.security.core.userdetails.User(email, "password", List.of());
        org.springframework.security.core.Authentication authentication = 
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null);

        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));

        MockHttpServletRequest httpServletRequest = new MockHttpServletRequest();

        AppException exception = assertThrows(AppException.class, () -> {
            authService.login(request, httpServletRequest);
        });

        assertEquals(ErrorCode.ACCOUNT_BANNED, exception.getErrorCode());
    }

    @Test
    void loginShouldThrowExceptionWhenUserIsSuspended() {
        String email = "suspended@example.com";
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword("password");

        User user = new User();
        user.setEmail(email);
        user.setStatus(UserStatus.SUSPENDED);

        org.springframework.security.core.userdetails.User principal = 
            new org.springframework.security.core.userdetails.User(email, "password", List.of());
        org.springframework.security.core.Authentication authentication = 
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null);

        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));

        MockHttpServletRequest httpServletRequest = new MockHttpServletRequest();

        AppException exception = assertThrows(AppException.class, () -> {
            authService.login(request, httpServletRequest);
        });

        assertEquals(ErrorCode.ACCOUNT_SUSPENDED, exception.getErrorCode());
    }

    @Test
    void refreshTokenShouldNotRevokeFamilyOnRecentPreviousHashReuse() {
        String staleRefresh = "stale-but-recent-refresh";
        String tokenHash = RefreshTokenHasher.hash(staleRefresh);
        UUID userId = UUID.randomUUID();

        UserSession rotatedSession = new UserSession();
        rotatedSession.setUserId(userId);
        rotatedSession.setPreviousRefreshTokenHash(tokenHash);
        rotatedSession.setLastActivityAt(LocalDateTime.now().minusSeconds(5));
        rotatedSession.setStatus("ACTIVE");

        when(userSessionRepository.findByRefreshTokenHash(tokenHash)).thenReturn(Optional.empty());
        when(userSessionRepository.findByPreviousRefreshTokenHash(tokenHash))
                .thenReturn(Optional.of(rotatedSession));

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken(staleRefresh);

        AppException exception = assertThrows(AppException.class,
                () -> authService.refreshToken(request, new MockHttpServletRequest()));

        assertEquals(ErrorCode.TOKEN_INVALID, exception.getErrorCode());
        verify(userSessionRepository, never()).revokeAllActiveSessions(any(), any());
    }

    @Test
    void refreshTokenShouldRevokeFamilyOnStalePreviousHashReuse() {
        String stolenRefresh = "stolen-old-refresh";
        String tokenHash = RefreshTokenHasher.hash(stolenRefresh);
        UUID userId = UUID.randomUUID();

        UserSession rotatedSession = new UserSession();
        rotatedSession.setUserId(userId);
        rotatedSession.setPreviousRefreshTokenHash(tokenHash);
        rotatedSession.setLastActivityAt(LocalDateTime.now().minusMinutes(5));
        rotatedSession.setStatus("ACTIVE");

        when(userSessionRepository.findByRefreshTokenHash(tokenHash)).thenReturn(Optional.empty());
        when(userSessionRepository.findByPreviousRefreshTokenHash(tokenHash))
                .thenReturn(Optional.of(rotatedSession));

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken(stolenRefresh);

        AppException exception = assertThrows(AppException.class,
                () -> authService.refreshToken(request, new MockHttpServletRequest()));

        assertEquals(ErrorCode.TOKEN_INVALID, exception.getErrorCode());
        verify(userSessionRepository).revokeAllActiveSessions(eq(userId), any(LocalDateTime.class));
    }
}
