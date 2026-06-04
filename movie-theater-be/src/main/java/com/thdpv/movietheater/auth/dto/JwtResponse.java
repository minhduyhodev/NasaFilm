package com.thdpv.movietheater.auth.dto;

import java.util.List;

public class JwtResponse {

    private String accessToken;
    private final String tokenType = "Bearer";
    private String refreshToken;
    private String email;
    private List<String> roles;

    public JwtResponse(String accessToken, String refreshToken, String email, List<String> roles, UUID userId,
            String fullName) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.email = email;
        this.roles = roles;
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
}
