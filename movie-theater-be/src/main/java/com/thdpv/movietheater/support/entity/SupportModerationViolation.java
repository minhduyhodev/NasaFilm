package com.thdpv.movietheater.support.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "support_moderation_violation")
public class SupportModerationViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    @Column(name = "violation_type", nullable = false, length = 32)
    private String violationType;

    @Column(name = "severity", nullable = false)
    private int severity;

    @Column(name = "penalty_action", nullable = false, length = 32)
    private String penaltyAction;

    @Column(name = "blocked_until")
    private OffsetDateTime blockedUntil;

    @Column(name = "details", length = 500)
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getViolationType() {
        return violationType;
    }

    public void setViolationType(String violationType) {
        this.violationType = violationType;
    }

    public int getSeverity() {
        return severity;
    }

    public void setSeverity(int severity) {
        this.severity = severity;
    }

    public String getPenaltyAction() {
        return penaltyAction;
    }

    public void setPenaltyAction(String penaltyAction) {
        this.penaltyAction = penaltyAction;
    }

    public OffsetDateTime getBlockedUntil() {
        return blockedUntil;
    }

    public void setBlockedUntil(OffsetDateTime blockedUntil) {
        this.blockedUntil = blockedUntil;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
