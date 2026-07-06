package com.thdpv.movietheater.user.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.UserStatus;

public class AdminUserResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatarUrl;
    private UserStatus status;
    private AuthProvider authProvider;
    private Integer score;
    private List<String> roles;
    private List<String> permissions;
    private LocalDateTime createdAt;

    public AdminUserResponse(UUID id, String email, String fullName, String phoneNumber, String avatarUrl,
            UserStatus status, AuthProvider authProvider, Integer score, List<String> roles, LocalDateTime createdAt) {
        this(id, email, fullName, phoneNumber, avatarUrl, status, authProvider, score, roles, List.of(), createdAt);
    }

    public AdminUserResponse(UUID id, String email, String fullName, String phoneNumber, String avatarUrl,
            UserStatus status, AuthProvider authProvider, Integer score, List<String> roles, List<String> permissions,
            LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.avatarUrl = avatarUrl;
        this.status = status;
        this.authProvider = authProvider;
        this.score = score;
        this.roles = roles;
        this.permissions = permissions;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(AuthProvider authProvider) {
        this.authProvider = authProvider;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
