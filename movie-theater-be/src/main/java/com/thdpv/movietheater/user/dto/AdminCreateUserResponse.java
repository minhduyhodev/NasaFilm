package com.thdpv.movietheater.user.dto;

import java.util.List;
import java.util.UUID;

import com.thdpv.movietheater.user.enums.UserStatus;

public class AdminCreateUserResponse {

    private UUID id;
    private String email;
    private String username;
    private String fullName;
    private UserStatus status;
    private List<String> roles;
    private List<String> permissions;
    private String message;
    private boolean activationEmailSent;

    public AdminCreateUserResponse() {
    }

    public AdminCreateUserResponse(UUID id, String email, String username, String fullName, UserStatus status,
            List<String> roles, String message, boolean activationEmailSent) {
        this(id, email, username, fullName, status, roles, List.of(), message, activationEmailSent);
    }

    public AdminCreateUserResponse(UUID id, String email, String username, String fullName, UserStatus status,
            List<String> roles, List<String> permissions, String message, boolean activationEmailSent) {
        this.id = id;
        this.email = email;
        this.username = username;
        this.fullName = fullName;
        this.status = status;
        this.roles = roles;
        this.permissions = permissions;
        this.message = message;
        this.activationEmailSent = activationEmailSent;
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

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isActivationEmailSent() {
        return activationEmailSent;
    }

    public void setActivationEmailSent(boolean activationEmailSent) {
        this.activationEmailSent = activationEmailSent;
    }
}
