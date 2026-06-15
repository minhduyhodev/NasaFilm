package com.thdpv.movietheater.user.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.user.dto.AdminUserResponse;
import com.thdpv.movietheater.user.dto.UpdateProfileRequest;
import com.thdpv.movietheater.user.dto.UserProfileResponse;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Cloudinary cloudinary;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            Cloudinary cloudinary,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cloudinary = cloudinary;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
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
        }

        userRepository.save(user);
        return mapToResponse(user);
    }

    @Transactional
    public UserProfileResponse uploadAvatar(String email, MultipartFile file) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
                String publicId = extractPublicId(user.getAvatarUrl());
                if (publicId != null) {
                    cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                }
            }

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "avatars"));
            String avatarUrl = (String) uploadResult.get("secure_url");
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

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
                user.getScore());
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers(String query) {
        List<User> users = userRepository.searchUsers(query);
        return users.stream().map(user -> {
            List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());
            List<String> roleNames = userRoles.stream()
                    .map(ur -> ur.getRole().getName().name())
                    .toList();
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
                    user.getCreatedAt());
        }).toList();
    }

    @Transactional
    public void updateUserStatus(UUID userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<UserRole> userRoles = userRoleRepository.findByUserId(userId);
        boolean isAdminOrStaff = userRoles.stream()
                .map(ur -> ur.getRole().getName())
                .anyMatch(role -> role == RoleName.ADMIN || role == RoleName.STAFF);

        if (isAdminOrStaff) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không thể cập nhật trạng thái cho tài khoản Admin hoặc Staff");
        }

        user.setStatus(status);
        userRepository.save(user);
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
    }

    @Transactional
    public void updateUserScore(UUID userId, Integer score) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setScore(score);
        userRepository.save(user);
    }
}