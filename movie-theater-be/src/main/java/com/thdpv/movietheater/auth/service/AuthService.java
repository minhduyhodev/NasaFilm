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
import com.thdpv.movietheater.auth.util.RefreshTokenHasher;

import jakarta.servlet.http.HttpServletRequest;

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
    public JwtResponse login(LoginRequest loginRequest, HttpServletRequest httpServletRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()));

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ensureAccountIsActive(user);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = jwtUtils.generateToken(userDetails.getUsername());
        return createSessionAndResponse(user, accessToken, roles, httpServletRequest);
    }

    @Transactional
    public JwtResponse loginWithGoogle(GoogleLoginRequest googleLoginRequest, HttpServletRequest httpServletRequest) {
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

        ensureAccountIsActive(user);

        String accessToken = jwtUtils.generateToken(user.getEmail());
        return createSessionAndResponse(user, accessToken, getRoleAuthorities(user), httpServletRequest);
    }

    @Transactional
    public JwtResponse refreshToken(TokenRefreshRequest request, HttpServletRequest httpServletRequest) {
        String token = request.getRefreshToken();
        String tokenHash = RefreshTokenHasher.hash(token);
        UserSession session = userSessionRepository.findByRefreshTokenHash(tokenHash)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID));

        if (!"ACTIVE".equals(session.getStatus()) || session.getRevokedAt() != null) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }

        if (session.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        ensureAccountIsActive(user);

        String newRefreshToken = generateRefreshToken();
        LocalDateTime newExpiryDate = calculateRefreshExpiry();

        session.setRefreshTokenHash(RefreshTokenHasher.hash(newRefreshToken));
        session.setExpiredAt(newExpiryDate);
        session.setLastActivityAt(LocalDateTime.now());
        session.setIpAddress(resolveIpAddress(httpServletRequest));
        session.setUserAgent(resolveUserAgent(httpServletRequest));
        session.setDeviceInfo(resolveUserAgent(httpServletRequest));
        userSessionRepository.save(session);

        String newAccessToken = jwtUtils.generateToken(user.getEmail());
        List<String> roles = getRoleAuthorities(user);

        return new JwtResponse(newAccessToken, newRefreshToken, user.getEmail(), roles,
                user.getId(), user.getFullName(), user.getAvatarUrl());
    }

    @Transactional
    public void logout(TokenRefreshRequest request) {
        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            userSessionRepository.findByRefreshTokenHash(RefreshTokenHasher.hash(request.getRefreshToken()))
                    .ifPresent(session -> {
                        session.setStatus("REVOKED");
                        session.setRevokedAt(LocalDateTime.now());
                        session.setLastActivityAt(LocalDateTime.now());
                        userSessionRepository.save(session);
                    });
        }
        SecurityContextHolder.clearContext();
    }

    private JwtResponse createSessionAndResponse(User user, String accessToken, List<String> roles,
            HttpServletRequest httpServletRequest) {
        String refreshToken = generateRefreshToken();
        LocalDateTime expiryDate = calculateRefreshExpiry();

        String userAgent = resolveUserAgent(httpServletRequest);
        UserSession userSession = new UserSession(
                user.getId(),
                RefreshTokenHasher.hash(refreshToken),
                userAgent,
                resolveIpAddress(httpServletRequest),
                userAgent,
                "ACTIVE",
                LocalDateTime.now(),
                expiryDate);
        userSessionRepository.save(userSession);

        return new JwtResponse(accessToken, refreshToken, user.getEmail(), roles, user.getId(),
                user.getFullName(), user.getAvatarUrl());
    }

    private String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }

    private LocalDateTime calculateRefreshExpiry() {
        return LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);
    }

    private void ensureAccountIsActive(User user) {
        if (user.getStatus() == UserStatus.ACTIVE) {
            return;
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new AppException(ErrorCode.USER_NOT_VERIFIED);
        }

        throw new AppException(ErrorCode.ACCOUNT_NOT_ACTIVE);
    }

    private List<String> getRoleAuthorities(User user) {
        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(userRole -> "ROLE_" + userRole.getRole().getName().name())
                .toList();
    }

    private String resolveIpAddress(HttpServletRequest httpServletRequest) {
        if (httpServletRequest == null) {
            return null;
        }

        String forwardedFor = httpServletRequest.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        return httpServletRequest.getRemoteAddr();
    }

    private String resolveUserAgent(HttpServletRequest httpServletRequest) {
        if (httpServletRequest == null) {
            return null;
        }
        return httpServletRequest.getHeader("User-Agent");
    }

    private User updateGoogleProfile(User user, String fullName, String avatarUrl) {
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatarUrl(avatarUrl);
        }
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(hasLocalCredentials(user) ? AuthProvider.LOCAL : AuthProvider.GOOGLE);
        }
        if (user.getStatus() == null) {
            user.setStatus(UserStatus.ACTIVE);
        }
        return userRepository.save(user);
    }

    private boolean hasLocalCredentials(User user) {
        return user.getPassword() != null && !user.getPassword().isBlank();
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
            user.setPhoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank() ? request.getPhoneNumber().trim() : null);
            user.setDayOfBirth(request.getDayOfBirth());
            user.setGender(request.getGender());
        } else {
            user = new User();
            user.setEmail(request.getEmail().trim());
            user.setFullName(request.getFullName().trim());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setStatus(UserStatus.PENDING_VERIFICATION);
            user.setAuthProvider(AuthProvider.LOCAL);
            user.setPhoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank() ? request.getPhoneNumber().trim() : null);
            user.setDayOfBirth(request.getDayOfBirth());
            user.setGender(request.getGender());
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
