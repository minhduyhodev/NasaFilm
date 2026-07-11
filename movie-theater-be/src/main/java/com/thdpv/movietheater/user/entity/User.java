package com.thdpv.movietheater.user.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.UserStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_phone_number", columnList = "phone_number"),
                @Index(name = "idx_users_status", columnList = "status")
        })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(length = 255)
    private String password;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "username", unique = true, length = 100)
    private String username;

    @Column(name = "day_of_birth")
    private LocalDate dayOfBirth;

    @Column(length = 50)
    private String gender;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "is_system_account", nullable = false, columnDefinition = "boolean default false")
    private Boolean isSystemAccount = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 50)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private UserStatus status;

    private Integer score = 0;

    @Column(name = "lifetime_score", nullable = false)
    private Integer lifetimeScore = 0;

    @Column(name = "wallet_balance", nullable = false, precision = 15, scale = 2)
    private java.math.BigDecimal walletBalance = java.math.BigDecimal.ZERO;

    @Version
    @Column(name = "wallet_version", nullable = false, columnDefinition = "bigint not null default 0")
    private Long walletVersion = 0L;

    @Column(name = "verification_code", length = 100)
    private String verificationCode;

    @Column(name = "verification_code_expiry")
    private LocalDateTime verificationCodeExpiry;

    @Column(name = "verification_attempts")
    private Integer verificationAttempts = 0;

    @Column(name = "verification_lock_time")
    private LocalDateTime verificationLockTime;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public User() {
    }

    public User(UUID id, String email, String password, String fullName, String username, LocalDate dayOfBirth,
            String gender, String avatarUrl, String phoneNumber, AuthProvider authProvider, UserStatus status,
            Integer score, String verificationCode, LocalDateTime verificationCodeExpiry, LocalDateTime createdAt,
            LocalDateTime updatedAt, UUID createdBy, UUID updatedBy) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.username = username;
        this.dayOfBirth = dayOfBirth;
        this.gender = gender;
        this.avatarUrl = avatarUrl;
        this.phoneNumber = phoneNumber;
        this.authProvider = authProvider;
        this.status = status;
        this.score = score;
        this.verificationCode = verificationCode;
        this.verificationCodeExpiry = verificationCodeExpiry;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    @PrePersist
    void applyDefaults() {
        if (authProvider == null) {
            authProvider = AuthProvider.LOCAL;
        }
        if (score == null) {
            score = 0;
        }
        if (walletBalance == null) {
            walletBalance = java.math.BigDecimal.ZERO;
        }
        if (walletVersion == null) {
            walletVersion = 0L;
        }
        if (isSystemAccount == null) {
            isSystemAccount = false;
        }
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

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public Boolean getIsSystemAccount() {
        return isSystemAccount;
    }

    public void setIsSystemAccount(Boolean isSystemAccount) {
        this.isSystemAccount = isSystemAccount;
    }

    public AuthProvider getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(AuthProvider authProvider) {
        this.authProvider = authProvider;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getLifetimeScore() {
        return lifetimeScore;
    }

    public void setLifetimeScore(Integer lifetimeScore) {
        this.lifetimeScore = lifetimeScore;
    }

    public java.math.BigDecimal getWalletBalance() {
        return walletBalance;
    }

    public void setWalletBalance(java.math.BigDecimal walletBalance) {
        this.walletBalance = walletBalance;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(UUID updatedBy) {
        this.updatedBy = updatedBy;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public LocalDateTime getVerificationCodeExpiry() {
        return verificationCodeExpiry;
    }

    public void setVerificationCodeExpiry(LocalDateTime verificationCodeExpiry) {
        this.verificationCodeExpiry = verificationCodeExpiry;
    }

    public Integer getVerificationAttempts() {
        return verificationAttempts;
    }

    public void setVerificationAttempts(Integer verificationAttempts) {
        this.verificationAttempts = verificationAttempts;
    }

    public LocalDateTime getVerificationLockTime() {
        return verificationLockTime;
    }

    public void setVerificationLockTime(LocalDateTime verificationLockTime) {
        this.verificationLockTime = verificationLockTime;
    }
}
