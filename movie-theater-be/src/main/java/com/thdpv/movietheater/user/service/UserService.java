package com.thdpv.movietheater.user.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.thdpv.movietheater.auth.repository.PermissionRepository;
import com.thdpv.movietheater.auth.repository.UserPermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.auth.service.EmailService;
import com.thdpv.movietheater.auth.service.PasswordResetService;
import com.thdpv.movietheater.security.CustomUserDetailsService;
import com.thdpv.movietheater.security.JwtUtils;
import com.thdpv.movietheater.user.dto.AdminCreateUserRequest;
import com.thdpv.movietheater.user.dto.AdminCreateUserResponse;
import com.thdpv.movietheater.user.dto.AdminUserStatsResponse;
import com.thdpv.movietheater.user.dto.CounterCreateCustomerRequest;
import com.thdpv.movietheater.user.dto.CounterCreateCustomerResponse;
import com.thdpv.movietheater.user.dto.AdminUserResponse;
import com.thdpv.movietheater.user.dto.PermissionResponse;
import com.thdpv.movietheater.user.dto.UpdateProfileRequest;
import com.thdpv.movietheater.user.dto.UserProfileResponse;
import com.thdpv.movietheater.user.entity.Permission;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserPermission;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.PermissionName;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Cloudinary cloudinary;
    private final UserRoleRepository userRoleRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final EmailService emailService;
    private final PasswordResetService passwordResetService;
    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService customUserDetailsService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    public static final String COUNTER_WALK_IN_EMAIL = "counter_guest@nasafilm.com";

    public UserService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            Cloudinary cloudinary,
            UserRoleRepository userRoleRepository,
            UserPermissionRepository userPermissionRepository,
            PermissionRepository permissionRepository,
            RoleRepository roleRepository,
            EmailService emailService,
            PasswordResetService passwordResetService,
            JwtUtils jwtUtils,
            CustomUserDetailsService customUserDetailsService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cloudinary = cloudinary;
        this.userRoleRepository = userRoleRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
        this.emailService = emailService;
        this.passwordResetService = passwordResetService;
        this.jwtUtils = jwtUtils;
        this.customUserDetailsService = customUserDetailsService;
    }

    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return mapToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim().isEmpty() ? null : request.getPhoneNumber().trim());
        }

        if (request.getDayOfBirth() != null) {
            user.setDayOfBirth(request.getDayOfBirth());
        }

        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }

        if (request.getCurrentPassword() != null || request.getNewPassword() != null) {
            if (user.getAuthProvider() == AuthProvider.GOOGLE) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Tài khoản đăng nhập bằng Google không thể đổi mật khẩu");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Mật khẩu hiện tại không đúng");
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            customUserDetailsService.evictByEmail(user.getEmail());
        }

        userRepository.save(user);
        return mapToResponse(user);
    }

    public UserProfileResponse uploadAvatar(String email, MultipartFile file) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            String previousAvatarUrl = user.getAvatarUrl();
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "avatars"));
            String avatarUrl = (String) uploadResult.get("secure_url");
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            // Chỉ xóa ảnh cũ sau khi ảnh mới đã upload và URL mới đã lưu thành công. Cloudinary I/O nằm ngoài
            // transaction DB để không giữ connection trong lúc chờ mạng; lỗi xóa ảnh cũ không làm hỏng avatar mới.
            if (previousAvatarUrl != null && !previousAvatarUrl.isBlank()) {
                String publicId = extractPublicId(previousAvatarUrl);
                if (publicId != null) {
                    try {
                        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                    } catch (Exception ignored) {
                        // Ảnh cũ mồ côi có thể được dọn bằng maintenance; không rollback URL avatar mới.
                    }
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Upload ảnh thất bại: " + e.getMessage());
        }

        return mapToResponse(user);
    }

    private String extractPublicId(String avatarUrl) {
        try {
            String marker = "/upload/";
            int idx = avatarUrl.indexOf(marker);
            if (idx == -1)
                return null;

            String afterUpload = avatarUrl.substring(idx + marker.length());

            if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
            }

            int dotIdx = afterUpload.lastIndexOf(".");
            if (dotIdx != -1) {
                afterUpload = afterUpload.substring(0, dotIdx);
            }

            return afterUpload;
        } catch (Exception e) {
            return null;
        }
    }

    private UserProfileResponse mapToResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getAuthProvider(),
                user.getPhoneNumber(),
                user.getDayOfBirth(),
                user.getGender(),
                user.getScore(),
                user.getLifetimeScore());
    }

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getCustomerUsers(String query, UserStatus status, Pageable pageable) {
        return getAdminUsers(query, status, pageable, false);
    }

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getAdminUsers(String query, UserStatus status, Pageable pageable, boolean staffOnly) {
        String normalizedQuery = query != null ? query.trim() : null;
        if (normalizedQuery != null && normalizedQuery.isEmpty()) {
            normalizedQuery = null;
        }
        Page<User> page = staffOnly
                ? userRepository.searchStaffUsers(normalizedQuery, status, pageable)
                : userRepository.searchCustomerUsers(normalizedQuery, status, pageable);
        return page.map(this::toAdminUserResponse);
    }

    @Transactional(readOnly = true)
    public AdminUserStatsResponse getCustomerUserStats() {
        return new AdminUserStatsResponse(
                userRepository.countCustomers(),
                userRepository.countCustomersByStatus(UserStatus.ACTIVE),
                userRepository.countCustomersByStatus(UserStatus.SUSPENDED),
                userRepository.countCustomersByStatus(UserStatus.PENDING_VERIFICATION),
                userRepository.countCustomersByStatus(UserStatus.INACTIVE),
                userRepository.countCustomersWithMinScore(10_000));
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());
        List<String> roleNames = userRoles.stream()
                .map(ur -> ur.getRole().getName().name())
                .toList();
        List<String> permissions = userPermissionRepository.findPermissionNamesByUserId(user.getId());
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getAuthProvider(),
                user.getScore(),
                roleNames,
                permissions,
                user.getCreatedAt());
    }

    @Transactional
    public void updateUserStatus(UUID userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Allow updating status for any user (except self, which is handled in frontend/controller)
        user.setStatus(status);
        userRepository.save(user);
        customUserDetailsService.evictByEmail(user.getEmail());
    }

    @Transactional
    public void updateUserRole(UUID userId, RoleName roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Role not found"));

        List<UserRole> existingRoles = userRoleRepository.findByUserId(userId);
        userRoleRepository.deleteAll(existingRoles);

        UserRole newUserRole = new UserRole();
        newUserRole.setUser(user);
        newUserRole.setRole(role);
        userRoleRepository.save(newUserRole);

        if (roleName != RoleName.STAFF) {
            userPermissionRepository.deleteByUserId(userId);
        }
        customUserDetailsService.evictByEmail(user.getEmail());
    }

    @Transactional
    public void updateUserScore(UUID userId, Integer score) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setScore(score);
        userRepository.save(user);
    }

    @Transactional
    public AdminCreateUserResponse createUserByAdmin(AdminCreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String fullName = request.getFullName().trim();
        RoleName roleName = RoleName.valueOf(request.getRoleName().trim().toUpperCase());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Email đã được sử dụng");
        }

        UUID adminId = resolveCurrentAdminId();
        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setCreatedBy(adminId);
        user.setUpdatedBy(adminId);

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }

        boolean activationEmailSent = false;
        String message;
        String staffPlainPassword = null;

        if (roleName == RoleName.STAFF) {
            staffPlainPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                    ? request.getPassword()
                    : generateSecureTemporaryPassword();
            user.setPassword(passwordEncoder.encode(staffPlainPassword));
            user.setStatus(UserStatus.INACTIVE);
            message = "Tạo tài khoản nhân viên thành công. Email kích hoạt đã được gửi.";
        } else if (roleName == RoleName.CUSTOMER) {
            String temporaryPassword = generateSecureTemporaryPassword();
            user.setPassword(passwordEncoder.encode(temporaryPassword));
            user.setStatus(UserStatus.INACTIVE);

            String activationToken = jwtUtils.generateActivationToken(email, user.getPassword());
            String activationLink = frontendUrl + "/activate-account?token=" + activationToken;

            emailService.sendAccountActivationEmail(
                    email, fullName, email, temporaryPassword, activationLink);
            activationEmailSent = true;
            message = "Tạo tài khoản khách hàng thành công. Email kích hoạt đã được gửi.";
        } else {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ được tạo tài khoản STAFF hoặc CUSTOMER");
        }

        user = userRepository.save(user);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Role not found"));
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        List<String> assignedPermissions = List.of();
        if (roleName == RoleName.STAFF) {
            assignedPermissions = assignUserPermissions(user.getId(), request.getStaffPreset(), request.getPermissions());

            String activationToken = jwtUtils.generateActivationToken(email, user.getPassword());
            String activationLink = frontendUrl + "/activate-account?token=" + activationToken;
            emailService.sendStaffActivationEmail(
                    email, fullName, email,
                    staffPlainPassword != null ? staffPlainPassword : "(Mật khẩu được tạo tự động — dùng link bên dưới để đặt mật khẩu mới)",
                    activationLink);
            activationEmailSent = true;
        }
        if (roleName == RoleName.ADMIN) {
            assignedPermissions = userPermissionRepository.findPermissionNamesByUserId(user.getId());
        }

        return new AdminCreateUserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                user.getStatus(),
                List.of(roleName.name()),
                assignedPermissions,
                message,
                activationEmailSent);
    }


    @Transactional(readOnly = true)
    public List<PermissionResponse> getAvailablePermissions() {
        return java.util.Arrays.stream(PermissionName.values())
                .map(permission -> new PermissionResponse(
                        permission.name(),
                        permission.getDescription(),
                        permission.getGroup()))
                .toList();
    }

    @Transactional
    public List<String> updateUserPermissions(UUID userId, List<String> permissions) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());
        boolean isStaff = userRoles.stream()
                .map(ur -> ur.getRole().getName())
                .anyMatch(role -> role == RoleName.STAFF);
        boolean isAdmin = userRoles.stream()
                .map(ur -> ur.getRole().getName())
                .anyMatch(role -> role == RoleName.ADMIN);

        if (!isStaff || isAdmin) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chỉ có thể cập nhật quyền chi tiết cho tài khoản STAFF");
        }

        List<String> updated = assignUserPermissions(user.getId(), null, permissions);
        customUserDetailsService.evictByEmail(user.getEmail());
        return updated;
    }

    private List<String> assignUserPermissions(UUID userId, String staffPreset, List<String> requestedPermissions) {
        Set<PermissionName> permissionNames = new LinkedHashSet<>();
        permissionNames.addAll(PermissionName.presetPermissions(staffPreset));

        if (requestedPermissions != null) {
            for (String permission : requestedPermissions) {
                if (permission == null || permission.isBlank()) {
                    continue;
                }
                try {
                    permissionNames.add(PermissionName.valueOf(permission.trim().toUpperCase()));
                } catch (IllegalArgumentException ex) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Permission không hợp lệ: " + permission);
                }
            }
        }

        userPermissionRepository.deleteByUserId(userId);

        List<String> assigned = new ArrayList<>();
        for (PermissionName permissionName : permissionNames) {
            Permission permission = permissionRepository.findByName(permissionName.name())
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST,
                            "Permission chưa được seed: " + permissionName.name()));
            UserPermission userPermission = new UserPermission();
            userPermission.setUserId(userId);
            userPermission.setPermissionId(permission.getId());
            userPermissionRepository.save(userPermission);
            assigned.add(permissionName.name());
        }
        return assigned;
    }

    @Transactional
    public CounterCreateCustomerResponse createCustomer(CounterCreateCustomerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String fullName = request.getFullName().trim();
        String phoneNumber = request.getPhoneNumber().trim();

        return userRepository.findByEmailIgnoreCase(email)
                .map(existingUser -> new CounterCreateCustomerResponse(
                        existingUser.getId(),
                        existingUser.getEmail(),
                        existingUser.getFullName(),
                        existingUser.getPhoneNumber(),
                        existingUser.getStatus(),
                        "Email đã tồn tại. Vui lòng xác nhận để gán giao dịch vào tài khoản có sẵn.",
                        true))
                .orElseGet(() -> createCounterCustomer(email, fullName, phoneNumber));
    }

    @Transactional
    public CounterCreateCustomerResponse getWalkInCustomer() {
        User guest = userRepository.findByEmailIgnoreCase(COUNTER_WALK_IN_EMAIL)
                .orElseGet(this::ensureWalkInGuestAccount);

        return new CounterCreateCustomerResponse(
                guest.getId(),
                guest.getEmail(),
                "Khách vãng lai",
                guest.getPhoneNumber(),
                guest.getStatus(),
                "Đã kích hoạt khách vãng lai",
                true);
    }

    private User ensureWalkInGuestAccount() {
        User guest = new User();
        guest.setEmail(COUNTER_WALK_IN_EMAIL);
        guest.setFullName("Khách vãng lai");
        guest.setIsSystemAccount(true);
        guest.setAuthProvider(AuthProvider.LOCAL);
        guest.setStatus(UserStatus.ACTIVE);
        guest = userRepository.save(guest);

        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(guest);
        userRole.setRole(customerRole);
        userRoleRepository.save(userRole);

        return guest;
    }

    private CounterCreateCustomerResponse createCounterCustomer(String email, String fullName, String phoneNumber) {
        UUID staffId = resolveCurrentAdminId();
        String temporaryPassword = generateSecureTemporaryPassword();

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPhoneNumber(phoneNumber);
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setAuthProvider(AuthProvider.LOCAL);
        // INACTIVE: khách phải kích hoạt qua email (đặt mật khẩu mới) trước khi đăng nhập web
        user.setStatus(UserStatus.INACTIVE);
        user.setCreatedBy(staffId);
        user.setUpdatedBy(staffId);
        user = userRepository.save(user);

        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(customerRole);
        userRoleRepository.save(userRole);

        String activationToken = jwtUtils.generateActivationToken(email, user.getPassword());
        String activationLink = frontendUrl + "/activate-account?token=" + activationToken;
        emailService.sendAccountActivationEmail(email, fullName, email, temporaryPassword, activationLink);

        return new CounterCreateCustomerResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getStatus(),
                "Tạo tài khoản khách hàng thành công. Email chào mừng hội viên đã được gửi.",
                false);
    }

    private UUID resolveCurrentAdminId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    private String generateSecureTemporaryPassword() {
        StringBuilder password = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            password.append(TEMP_PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return password.toString();
    }
}