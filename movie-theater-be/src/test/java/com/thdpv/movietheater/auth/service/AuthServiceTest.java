package com.thdpv.movietheater.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
import org.springframework.test.util.ReflectionTestUtils;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.thdpv.movietheater.auth.dto.GoogleLoginRequest;
import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.entity.UserSession;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

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
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                jwtUtils,
                userSessionRepository,
                userRepository,
                userRoleRepository,
                googleIdTokenVerifier,
                passwordEncoder,
                emailService,
                roleRepository);

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
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
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

        JwtResponse response = authService.loginWithGoogle(request);

        assertEquals(email, response.getEmail());
        assertEquals(fullName, response.getFullName());
        assertEquals(avatarUrl, response.getAvatarUrl());
        assertEquals(List.of("ROLE_CUSTOMER"), response.getRoles());
        assertEquals("generated-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertSame(savedUser.getId(), response.getUserId());
        assertEquals(avatarUrl, savedUser.getAvatarUrl());
        assertEquals(fullName, savedUser.getFullName());
        assertEquals(AuthProvider.GOOGLE, savedUser.getAuthProvider());
        assertEquals(UserStatus.ACTIVE, savedUser.getStatus());
    }

    private GoogleIdToken createGoogleIdToken(String email, String fullName, String avatarUrl, boolean emailVerified) {
        Payload payload = new Payload();
        payload.setEmail(email);
        payload.setEmailVerified(emailVerified);
        payload.put("name", fullName);
        payload.put("picture", avatarUrl);

        return new GoogleIdToken(new JsonWebSignature.Header(), payload, new byte[0], new byte[0]);
    }
}
