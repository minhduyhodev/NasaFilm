package com.thdpv.movietheater.user.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(max = 100)
    private String fullName;

    @Pattern(regexp = "^$|^0[35789][0-9]{8}$", message = "So dien thoai khong dung dinh dang")
    private String phoneNumber;

    private String currentPassword;

    @Size(min = 6)
    private String newPassword;

    @Past(message = "Ngay sinh phai o qua khu")
    private LocalDate dayOfBirth;

    @Pattern(regexp = "^(MALE|FEMALE|OTHER)$", message = "Gioi tinh khong hop le")
    private String gender;

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

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }

    public LocalDate getDayOfBirth() {
        return dayOfBirth;
    }

    public void setDayOfBirth(LocalDate dayOfBirth) {
        this.dayOfBirth = dayOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }
}
