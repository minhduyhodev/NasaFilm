package com.thdpv.movietheater.user.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.thdpv.movietheater.user.enums.AuthProvider;

public class UserProfileResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private AuthProvider authProvider;
    private String phoneNumber;
    private LocalDate dayOfBirth;
    private String gender;
    private Integer score;

    public UserProfileResponse(UUID id, String email, String fullName,
            String avatarUrl, AuthProvider authProvider, String phoneNumber,
            LocalDate dayOfBirth, String gender, Integer score) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.authProvider = authProvider;
        this.phoneNumber = phoneNumber;
        this.dayOfBirth = dayOfBirth;
        this.gender = gender;
        this.score = score;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public LocalDate getDayOfBirth() {
        return dayOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public Integer getScore() {
        return score;
    }
}
