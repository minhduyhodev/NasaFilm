package com.thdpv.movietheater.auth.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.thdpv.movietheater.auth.dto.GoogleLoginRequest;
import com.thdpv.movietheater.auth.dto.JwtResponse;
import com.thdpv.movietheater.auth.dto.LoginRequest;
import com.thdpv.movietheater.auth.dto.RegisterRequest;
import com.thdpv.movietheater.auth.dto.TokenRefreshRequest;
import com.thdpv.movietheater.auth.dto.VerifyRequest;
import com.thdpv.movietheater.auth.entity.UserSession;
import com.thdpv.movietheater.auth.repository.RolePermissionRepository;
import com.thdpv.movietheater.auth.repository.UserPermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.auth.repository.UserSessionRepository;
import com.thdpv.movietheater.auth.util.RefreshTokenHasher;
import com.thdpv.movietheater.auth.support.AuthActionRateLimiter;
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

import jakarta.servlet.http.HttpServletRequest;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    /** Multi-tab refresh within this window after rotation is treated as race, not token theft. */
    private static final long REFRESH_REUSE_GRACE_SECONDS = 60;

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final RoleRepository roleRepository;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuthActionRateLimiter authActionRateLimiter;

    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    private final ConcurrentHashMap<String, LocalDateTime> otpRequestCooldown = new ConcurrentHashMap<>();

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
            RolePermissionRepository rolePermissionRepository,
            UserPermissionRepository userPermissionRepository,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            RoleRepository roleRepository,
            AuthActionRateLimiter authActionRateLimiter,
            org.springframework.data.redis.core.StringRedisTemplate redisTemplate) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userSessionRepository = userSessionRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.roleRepository = roleRepository;
        this.authActionRateLimiter = authActionRateLimiter;
        this.redisTemplate = redisTemplate;
    }

    @Transactional
    public JwtResponse login(LoginRequest loginRequest, HttpServletRequest httpServletRequest) {
        String email = loginRequest.getEmail() != null ? loginRequest.getEmail().trim() : "";
        authActionRateLimiter.assertLoginAllowed(clientKey(httpServletRequest, email));

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, loginRequest.getPassword()));

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ensureAccountIsActive(user);
        ensureNotSystemAccount(user);

        List<String> authorities = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = jwtUtils.generateToken(userDetails.getUsername());
        return createSessionAndResponse(user, accessToken, authorities, httpServletRequest);
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
        ensureNotSystemAccount(user);

        String accessToken = jwtUtils.generateToken(user.getEmail());
        return createSessionAndResponse(user, accessToken, getRoleAuthorities(user), httpServletRequest);
    }

    @Transactional
    public JwtResponse refreshToken(TokenRefreshRequest request, HttpServletRequest httpServletRequest) {
        String token = request.getRefreshToken();
        String tokenHash = RefreshTokenHasher.hash(token);

        Optional<UserSession> sessionOpt = userSessionRepository.findByRefreshTokenHash(tokenHash);
        if (sessionOpt.isEmpty()) {
            // Already-rotated refresh: either multi-tab race (recent) or stolen-token reuse (stale).
            userSessionRepository.findByPreviousRefreshTokenHash(tokenHash).ifPresent(compromised -> {
                LocalDateTime rotatedAt = compromised.getLastActivityAt();
                boolean recentRace = rotatedAt != null
                        && rotatedAt.isAfter(LocalDateTime.now().minusSeconds(REFRESH_REUSE_GRACE_SECONDS));
                if (!recentRace) {
                    userSessionRepository.revokeAllActiveSessions(compromised.getUserId(), LocalDateTime.now());
                }
            });
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi. Vui lòng đăng nhập lại.");
        }

        UserSession session = sessionOpt.get();
        if (!"ACTIVE".equals(session.getStatus()) || session.getRevokedAt() != null) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }

        if (session.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        ensureAccountIsActive(user);
        ensureNotSystemAccount(user);

        String newRefreshToken = generateRefreshToken();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime newExpiryDate = calculateRefreshExpiry();
        String ipAddress = resolveIpAddress(httpServletRequest);
        String userAgent = resolveUserAgent(httpServletRequest);

        int rotated = userSessionRepository.rotateRefreshToken(
                session.getId(),
                tokenHash,
                RefreshTokenHasher.hash(newRefreshToken),
                newExpiryDate,
                now,
                ipAddress,
                userAgent);
        if (rotated == 0) {
            // Lost a concurrent refresh race (another tab already rotated this token).
            // Do NOT revoke the whole family — that would log the user out of every device.
            // True stolen-token reuse is handled above via previous_refresh_token_hash.
            throw new AppException(ErrorCode.TOKEN_INVALID,
                    "Phiên làm mới đã được dùng ở thiết bị khác. Vui lòng thử lại hoặc đăng nhập lại.");
        }

        String newAccessToken = jwtUtils.generateToken(user.getEmail());
        List<String> authorities = getRoleAuthorities(user);
        List<String> roles = authorities.stream()
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .distinct()
                .toList();
        List<String> permissions = authorities.stream()
                .filter(authority -> !authority.startsWith("ROLE_"))
                .distinct()
                .toList();

        return new JwtResponse(newAccessToken, newRefreshToken, user.getEmail(), roles, permissions,
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

    private JwtResponse createSessionAndResponse(User user, String accessToken, List<String> authorities,
            HttpServletRequest httpServletRequest) {
        String refreshToken = generateRefreshToken();
        LocalDateTime expiryDate = calculateRefreshExpiry();

        String userAgent = resolveUserAgent(httpServletRequest);
        String ipAddress = resolveIpAddress(httpServletRequest);

        Optional<UserSession> existingSessionOpt = Optional.empty();
        if (userAgent != null && !userAgent.isBlank()) {
            existingSessionOpt = userSessionRepository.findFirstByUserIdAndUserAgent(
                    user.getId(), userAgent);
        }

        UserSession userSession;
        if (existingSessionOpt.isPresent()) {
            userSession = existingSessionOpt.get();
            userSession.setRefreshTokenHash(RefreshTokenHasher.hash(refreshToken));
            userSession.setExpiredAt(expiryDate);
            userSession.setStatus("ACTIVE");
            userSession.setRevokedAt(null);
            userSession.setLastActivityAt(LocalDateTime.now());
            userSession.setIpAddress(ipAddress);
        } else {
            userSession = new UserSession(
                    user.getId(),
                    RefreshTokenHasher.hash(refreshToken),
                    userAgent,
                    ipAddress,
                    userAgent,
                    "ACTIVE",
                    LocalDateTime.now(),
                    expiryDate);
        }
        userSessionRepository.save(userSession);

        List<String> roles = authorities.stream()
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .distinct()
                .toList();
        List<String> permissions = authorities.stream()
                .filter(authority -> !authority.startsWith("ROLE_"))
                .distinct()
                .toList();

        return new JwtResponse(accessToken, refreshToken, user.getEmail(), roles, permissions, user.getId(),
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

        if (user.getStatus() == UserStatus.BANNED) {
            throw new AppException(ErrorCode.ACCOUNT_BANNED);
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new AppException(ErrorCode.ACCOUNT_SUSPENDED);
        }

        throw new AppException(ErrorCode.ACCOUNT_NOT_ACTIVE);
    }

    private void ensureNotSystemAccount(User user) {
        if (Boolean.TRUE.equals(user.getIsSystemAccount())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    private List<String> getRoleAuthorities(User user) {
        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        List<String> authorities = new ArrayList<>();
        List<UUID> roleIds = new ArrayList<>();
        for (UserRole userRole : userRoles) {
            authorities.add("ROLE_" + userRole.getRole().getName().name());
            roleIds.add(userRole.getRole().getId());
        }

        if (!roleIds.isEmpty()) {
            // Load permissions for ALL roles the user has (ADMIN, STAFF, etc.)
            authorities.addAll(rolePermissionRepository.findPermissionNamesByRoleIds(roleIds));
        }
        authorities.addAll(userPermissionRepository.findPermissionNamesByUserId(user.getId()));

        return authorities.stream().distinct().toList();
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
        if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())
                && avatarUrl != null
                && !avatarUrl.isBlank()) {
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
        User savedUser = userRepository.saveAndFlush(user);

        Role defaultRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Default customer role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(defaultRole);
        userRoleRepository.save(userRole);

        return savedUser;
    }

    @Transactional
    public void register(RegisterRequest request, HttpServletRequest httpServletRequest) {
        String email = request.getEmail().trim().toLowerCase();
        authActionRateLimiter.assertRegisterAllowed(clientKey(httpServletRequest, email));

        Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(request.getEmail().trim());
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            LocalDateTime lockTime = existingUser.getVerificationLockTime();
            if (lockTime != null && lockTime.isAfter(LocalDateTime.now())) {
                long secondsLeft = Duration.between(LocalDateTime.now(), lockTime).toSeconds();
                if (secondsLeft > 60) {
                    long minutesLeft = (secondsLeft + 59) / 60;
                    throw new AppException(ErrorCode.BAD_REQUEST,
                            "Tài khoản tạm thời bị khóa do nhập sai OTP quá nhiều lần. Vui lòng thử lại sau " + minutesLeft
                                    + " phút.");
                } else {
                    throw new AppException(ErrorCode.BAD_REQUEST,
                            "Tài khoản tạm thời bị khóa do nhập sai OTP quá nhiều lần. Vui lòng thử lại sau " + secondsLeft
                                    + " giây.");
                }
            }
        }

        long secondsLeft = 0;
        boolean redisWorked = false;
        try {
            String redisKey = "otp:cooldown:register:" + email;
            String ttlVal = redisTemplate.opsForValue().get(redisKey);
            if (ttlVal != null) {
                long expiredTimestamp = Long.parseLong(ttlVal);
                long currentTimestamp = System.currentTimeMillis();
                if (expiredTimestamp > currentTimestamp) {
                    secondsLeft = (expiredTimestamp - currentTimestamp) / 1000;
                    if (secondsLeft <= 0) secondsLeft = 1;
                }
            }
            redisWorked = true;
        } catch (Exception ex) {
            logger.warn("Redis is offline, falling back to local memory for OTP cooldown check: {}", ex.getMessage());
        }

        if (!redisWorked) {
            LocalDateTime lastRequest = otpRequestCooldown.get(email);
            if (lastRequest != null && lastRequest.plusSeconds(60).isAfter(LocalDateTime.now())) {
                secondsLeft = Duration.between(LocalDateTime.now(), lastRequest.plusSeconds(60)).toSeconds();
            }
        }

        if (secondsLeft > 0) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Vui lòng đợi " + secondsLeft + " giây trước khi yêu cầu mã OTP mới.");
        }

        User user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getStatus() == UserStatus.ACTIVE) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setFullName(request.getFullName().trim());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setPhoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                    ? request.getPhoneNumber().trim()
                    : null);
            user.setDayOfBirth(request.getDayOfBirth());
            user.setGender(request.getGender());
        } else {
            user = new User();
            user.setEmail(request.getEmail().trim());
            user.setFullName(request.getFullName().trim());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setStatus(UserStatus.PENDING_VERIFICATION);
            user.setAuthProvider(AuthProvider.LOCAL);
            user.setPhoneNumber(request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()
                    ? request.getPhoneNumber().trim()
                    : null);
            user.setDayOfBirth(request.getDayOfBirth());
            user.setGender(request.getGender());
        }

        String otpCode = String.format("%06d", new SecureRandom().nextInt(1000000));
        user.setVerificationCode(passwordEncoder.encode(otpCode));
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(5));
        if (existingUserOpt.isEmpty()) {
            user.setVerificationAttempts(0);
            user.setVerificationLockTime(null);
        }

        userRepository.save(user);

        boolean redisSaved = false;
        try {
            String redisKey = "otp:cooldown:register:" + email;
            long expireAt = System.currentTimeMillis() + 60000;
            redisTemplate.opsForValue().set(redisKey, String.valueOf(expireAt), java.time.Duration.ofSeconds(60));
            redisSaved = true;
        } catch (Exception ex) {
            logger.warn("Redis is offline, falling back to local memory to save OTP cooldown: {}", ex.getMessage());
        }

        if (!redisSaved) {
            otpRequestCooldown.put(email, LocalDateTime.now());
        }

        emailService.sendOtpEmail(user.getEmail(), otpCode);
    }

    @Transactional(noRollbackFor = AppException.class)
    public void verifyRegister(VerifyRequest request, HttpServletRequest httpServletRequest) {
        String email = request.getEmail().trim();
        authActionRateLimiter.assertOtpVerifyAllowed(clientKey(httpServletRequest, email));

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.USER_ALREADY_ACTIVE);
        }

        LocalDateTime lockTime = user.getVerificationLockTime();
        if (lockTime != null && lockTime.isAfter(LocalDateTime.now())) {
            long secondsLeft = Duration.between(LocalDateTime.now(), lockTime).toSeconds();
            if (secondsLeft > 60) {
                long minutesLeft = (secondsLeft + 59) / 60;
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Tài khoản tạm thời bị khóa do nhập sai OTP quá nhiều lần. Vui lòng thử lại sau " + minutesLeft
                                + " phút.");
            } else {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Tài khoản tạm thời bị khóa do nhập sai OTP quá nhiều lần. Vui lòng thử lại sau " + secondsLeft
                                + " giây.");
            }
        }

        String submittedCode = request.getCode() != null ? request.getCode().trim() : "";
        String storedCode = user.getVerificationCode();
        boolean otpValid = storedCode != null
                && user.getVerificationCodeExpiry() != null
                && !user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())
                && matchesVerificationCode(submittedCode, storedCode);

        if (!otpValid) {
            int attempts = (user.getVerificationAttempts() != null ? user.getVerificationAttempts() : 0) + 1;
            final int maxAttempts = 5;
            if (attempts >= maxAttempts) {
                user.setVerificationLockTime(LocalDateTime.now().plusMinutes(15));
                user.setVerificationAttempts(0);
                userRepository.save(user);
                throw new AppException(ErrorCode.VERIFICATION_CODE_INVALID,
                        "Mã xác thực không hợp lệ. Bạn đã nhập sai quá " + maxAttempts
                                + " lần, tài khoản bị tạm khóa 15 phút.");
            } else {
                user.setVerificationAttempts(attempts);
                userRepository.save(user);
                throw new AppException(ErrorCode.VERIFICATION_CODE_INVALID,
                        "Mã xác thực không hợp lệ hoặc đã hết hạn. Bạn còn " + (maxAttempts - attempts) + " lần thử.");
            }
        }

        // Add Customer Role
        Role role = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_ERROR));

        user.setVerificationAttempts(0);
        user.setVerificationLockTime(null);
        user.setStatus(UserStatus.ACTIVE);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        // Check if UserRole mapping already exists
        if (userRoleRepository.findByUserId(user.getId()).stream()
                .noneMatch(ur -> ur.getRole().getName() == RoleName.CUSTOMER)) {
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(role);
            userRoleRepository.save(userRole);
        }
    }

    private boolean matchesVerificationCode(String submitted, String stored) {
        if (submitted == null || submitted.isBlank() || stored == null || stored.isBlank()) {
            return false;
        }
        // BCrypt hashes start with $2; allow brief plaintext match for in-flight OTPs after deploy
        if (stored.startsWith("$2")) {
            return passwordEncoder.matches(submitted, stored);
        }
        return stored.equals(submitted);
    }

    private String clientKey(HttpServletRequest request, String email) {
        String ip = "unknown";
        if (request != null) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                ip = forwarded.split(",")[0].trim();
            } else if (request.getRemoteAddr() != null) {
                ip = request.getRemoteAddr();
            }
        }
        String identity = email != null ? email.trim().toLowerCase() : "";
        return ip + "|" + identity;
    }

    @Transactional
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredSessions() {
        userSessionRepository.deleteByExpiredAtBeforeOrStatus(LocalDateTime.now(), "REVOKED");
    }
}
