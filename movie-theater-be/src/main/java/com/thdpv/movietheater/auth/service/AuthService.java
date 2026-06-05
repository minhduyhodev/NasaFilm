package com.thdpv.movietheater.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.thdpv.movietheater.auth.dto.GoogleLoginRequest;
import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.dto.LoginRequest;
import com.thdpv.movietheater.auth.dto.TokenRefreshRequest;
import com.thdpv.movietheater.auth.entity.UserSession;
import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.auth.dto.RegisterRequest;
import com.thdpv.movietheater.auth.dto.VerifyRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtUtils jwtUtils,
            UserSessionRepository userSessionRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            RoleRepository roleRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userSessionRepository = userSessionRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.roleRepository = roleRepository;
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

        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.USER_NOT_VERIFIED);
        }

        String refreshToken = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);

        UserSession userSession = new UserSession(user, refreshToken, expiryDate, null, null);
        userSessionRepository.save(userSession);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return createSessionAndResponse(user, accessToken, roles);
    }

    @Transactional
    public JwtResponse loginWithGoogle(GoogleLoginRequest googleLoginRequest) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Google login is not configured on the server");
        }

        GoogleIdToken idToken;
        try {
            idToken = googleIdTokenVerifier.verify(googleLoginRequest.getIdToken());
        } catch (Exception ex) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Google ID token is invalid");
        }

        if (idToken == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Google ID token is invalid");
        }

        Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String fullName = (String) payload.get("name");
        String avatarUrl = (String) payload.get("picture");
        Boolean emailVerified = payload.getEmailVerified();

        if (email == null || email.isBlank() || !Boolean.TRUE.equals(emailVerified)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Google account must have a verified email");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .map(existingUser -> updateGoogleProfile(existingUser, fullName, avatarUrl))
                .orElseGet(() -> createGoogleUser(email, fullName, avatarUrl));

        String accessToken = jwtUtils.generateToken(user.getEmail());
        return createSessionAndResponse(user, accessToken, getRoleAuthorities(user));
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

        String newRefreshToken = UUID.randomUUID().toString();
        LocalDateTime newExpiryDate = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);

        session.setRefreshToken(newRefreshToken);
        session.setExpiryDate(newExpiryDate);
        userSessionRepository.save(session);

        String newAccessToken = jwtUtils.generateToken(session.getUser().getEmail());
        List<String> roles = getRoleAuthorities(session.getUser());

        return new JwtResponse(newAccessToken, newRefreshToken, session.getUser().getEmail(), roles,
                session.getUser().getId(), session.getUser().getFullName(), session.getUser().getAvatarUrl());
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

    private JwtResponse createSessionAndResponse(User user, String accessToken, List<String> roles) {
        String refreshToken = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);

        UserSession userSession = new UserSession(user, refreshToken, expiryDate, null, null);
        userSessionRepository.save(userSession);

        return new JwtResponse(accessToken, refreshToken, user.getEmail(), roles, user.getId(),
                user.getFullName(), user.getAvatarUrl());
    }

    private List<String> getRoleAuthorities(User user) {
        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(userRole -> "ROLE_" + userRole.getRole().getName().name())
                .toList();
    }

    private User updateGoogleProfile(User user, String fullName, String avatarUrl) {
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatarUrl(avatarUrl);
        }
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(AuthProvider.GOOGLE);
        }
        if (user.getStatus() == null) {
            user.setStatus(UserStatus.ACTIVE);
        }
        return userRepository.save(user);
    }

    private User createGoogleUser(String email, String fullName, String avatarUrl) {
        User user = new User();
        user.setEmail(email);
        user.setFullName((fullName == null || fullName.isBlank()) ? email : fullName);
        user.setAvatarUrl(avatarUrl);
        user.setPassword(null);
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        Role defaultRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Default customer role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(defaultRole);
        userRoleRepository.save(userRole);

        return user;
    }

    @Transactional
    public void register(RegisterRequest request) {
        java.util.Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(request.getEmail().trim());
        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getStatus() == UserStatus.ACTIVE) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setFullName(request.getFullName().trim());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        } else {
            user = new User();
            user.setEmail(request.getEmail().trim());
            user.setFullName(request.getFullName().trim());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setStatus(UserStatus.PENDING_VERIFICATION);
        }

        // Generate 6-digit random code
        String otpCode = String.format("%06d", new java.util.Random().nextInt(1000000));
        user.setVerificationCode(otpCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));

        userRepository.save(user);

        // Send OTP email
        emailService.sendOtpEmail(user.getEmail(), otpCode);
    }

    @Transactional
    public void verifyRegister(VerifyRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.USER_ALREADY_ACTIVE);
        }

        if (user.getVerificationCode() == null
                || !user.getVerificationCode().equals(request.getCode().trim())
                || user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        user.setStatus(UserStatus.ACTIVE);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        // Add Customer Role
        Role role = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_ERROR));

        // Check if UserRole mapping already exists
        if (userRoleRepository.findByUserId(user.getId()).stream()
                .noneMatch(ur -> ur.getRole().getName() == RoleName.CUSTOMER)) {
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(role);
            userRoleRepository.save(userRole);
        }
    }
}
