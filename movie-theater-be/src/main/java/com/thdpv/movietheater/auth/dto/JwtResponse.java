package com.thdpv.movietheater.auth.dto;

import java.util.List;
import java.util.UUID;

public class JwtResponse {

    private String accessToken;
    private final String tokenType = "Bearer";
    private String refreshToken;
    private String email;
    private List<String> roles;
    private List<String> permissions;
    private UUID userId;
    private String fullName;
    private String avatarUrl;

    public JwtResponse(String accessToken, String refreshToken, String email, List<String> roles, UUID userId,
            String fullName, String avatarUrl) {
        this(accessToken, refreshToken, email, roles, roles, userId, fullName, avatarUrl);
    }

    public JwtResponse(String accessToken, String refreshToken, String email, List<String> roles, List<String> permissions,
            UUID userId, String fullName, String avatarUrl) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.roles = roles;
        this.permissions = permissions;
        this.userId = userId;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
