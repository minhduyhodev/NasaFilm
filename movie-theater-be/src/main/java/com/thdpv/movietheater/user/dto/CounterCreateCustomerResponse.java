package com.thdpv.movietheater.user.dto;

import java.util.UUID;

import com.thdpv.movietheater.user.enums.UserStatus;

public class CounterCreateCustomerResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private UserStatus status;
    private String message;
    private boolean existingAccount;

    public CounterCreateCustomerResponse() {
    }

    public CounterCreateCustomerResponse(UUID id, String email, String fullName, String phoneNumber,
            UserStatus status, String message, boolean existingAccount) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.status = status;
        this.message = message;
        this.existingAccount = existingAccount;
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

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isExistingAccount() {
        return existingAccount;
    }

    public void setExistingAccount(boolean existingAccount) {
        this.existingAccount = existingAccount;
    }
}
