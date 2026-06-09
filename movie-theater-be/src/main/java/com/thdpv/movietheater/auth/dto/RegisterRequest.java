package com.thdpv.movietheater.auth.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Email khong duoc de trong")
    @Email(message = "Email khong dung dinh dang")
    private String email;

    @NotBlank(message = "Mat khau khong duoc de trong")
    @Size(min = 6, message = "Mat khau phai co it nhat 6 ky tu")
    private String password;

    @NotBlank(message = "Ho va ten khong duoc de trong")
    private String fullName;

    @Pattern(regexp = "^$|^0[35789][0-9]{8}$", message = "So dien thoai khong dung dinh dang")
    private String phoneNumber;

    @NotNull(message = "Ngay sinh khong duoc de trong")
    @Past(message = "Ngay sinh phai o qua khu")
    private LocalDate dayOfBirth;

    @NotBlank(message = "Gioi tinh khong duoc de trong")
    @Pattern(regexp = "^(MALE|FEMALE|OTHER)$", message = "Gioi tinh khong hop le")
    private String gender;

    public RegisterRequest(String email, String password, String fullName, String phoneNumber, LocalDate dayOfBirth, String gender) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.dayOfBirth = dayOfBirth;
        this.gender = gender;
    }

    public RegisterRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

