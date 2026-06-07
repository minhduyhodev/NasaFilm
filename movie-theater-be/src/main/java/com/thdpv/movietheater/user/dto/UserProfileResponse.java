package com.thdpv.movietheater.user.dto;

import java.util.UUID;

import com.thdpv.movietheater.user.enums.AuthProvider;

public class UserProfileResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private AuthProvider authProvider;

    public UserProfileResponse(UUID id, String email, String fullName, 
                                String avatarUrl, AuthProvider authProvider) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.authProvider = authProvider;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getAvatarUrl() { return avatarUrl; }
    public AuthProvider getAuthProvider() { return authProvider; }
}