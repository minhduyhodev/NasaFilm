package com.thdpv.movietheater.auth.dto;

import java.util.List;
import java.util.UUID;

public class AuthMeResponse {

    private UUID userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private List<String> roles;
    private List<String> permissions;

    public AuthMeResponse(UUID userId, String email, String fullName, String avatarUrl,
            List<String> roles, List<String> permissions) {
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.roles = roles;
        this.permissions = permissions;
    }

    public UUID getUserId() {
        return userId;
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

    public List<String> getRoles() {
        return roles;
    }

    public List<String> getPermissions() {
        return permissions;
    }
}
