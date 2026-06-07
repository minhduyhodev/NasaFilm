package com.thdpv.movietheater.user.service;

import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.dto.UpdateProfileRequest;
import com.thdpv.movietheater.user.dto.UserProfileResponse;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Cloudinary cloudinary;

    public UserService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            Cloudinary cloudinary) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cloudinary = cloudinary;
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
            user.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getCurrentPassword() != null || request.getNewPassword() != null) {
            if (user.getAuthProvider() == AuthProvider.GOOGLE) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Tài khoản Google không thể đổi mật khẩu");
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
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "avatars"));
            String avatarUrl = (String) uploadResult.get("secure_url");
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        } catch (Exception e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Upload ảnh thất bại");
        }

        return mapToResponse(user);
    }

    private UserProfileResponse mapToResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getAuthProvider(),
                user.getPhoneNumber()
        );
    }
}
