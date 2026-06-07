package com.thdpv.movietheater.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.dto.UpdateProfileRequest;
import com.thdpv.movietheater.user.dto.UserProfileResponse;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

        if (request.getCurrentPassword() != null || request.getNewPassword() != null) {
            if (user.getAuthProvider() == AuthProvider.GOOGLE) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Tai khoan Google khong the doi mat khau");
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Invalid Password");
            }

            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        userRepository.save(user);
        return mapToResponse(user);
    }

    private UserProfileResponse mapToResponse(User user) {
    return new UserProfileResponse(
        user.getId(),
        user.getEmail(),
        user.getFullName(),
        user.getAvatarUrl(),
        user.getAuthProvider()
    );
}
}