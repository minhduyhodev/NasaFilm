package com.thdpv.movietheater.mission.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.thdpv.movietheater.mission.enums.UserMissionStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "user_mission",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_mission_user_template_cycle",
                columnNames = { "user_uuid", "mission_template_uuid", "cycle_key" }))
public class UserMission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "mission_template_uuid", nullable = false)
    private UUID missionTemplateUuid;

    @Column(name = "cycle_key", nullable = false, length = 32)
    private String cycleKey = "ONCE";

    @Column(name = "template_version", nullable = false)
    private int templateVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private UserMissionStatus status = UserMissionStatus.IN_PROGRESS;

    @Column(name = "progress_current", nullable = false)
    private int progressCurrent = 0;

    @Column(name = "progress_target", nullable = false)
    private int progressTarget = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "progress_json", columnDefinition = "jsonb")
    private String progressJson;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "enrolled_at", updatable = false)
    private OffsetDateTime enrolledAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public UUID getMissionTemplateUuid() {
        return missionTemplateUuid;
    }

    public void setMissionTemplateUuid(UUID missionTemplateUuid) {
        this.missionTemplateUuid = missionTemplateUuid;
    }

    public String getCycleKey() {
        return cycleKey;
    }

    public void setCycleKey(String cycleKey) {
        this.cycleKey = cycleKey;
    }

    public int getTemplateVersion() {
        return templateVersion;
    }

    public void setTemplateVersion(int templateVersion) {
        this.templateVersion = templateVersion;
    }

    public UserMissionStatus getStatus() {
        return status;
    }

    public void setStatus(UserMissionStatus status) {
        this.status = status;
    }

    public int getProgressCurrent() {
        return progressCurrent;
    }

    public void setProgressCurrent(int progressCurrent) {
        this.progressCurrent = progressCurrent;
    }

    public int getProgressTarget() {
        return progressTarget;
    }

    public void setProgressTarget(int progressTarget) {
        this.progressTarget = progressTarget;
    }

    public String getProgressJson() {
        return progressJson;
    }

    public void setProgressJson(String progressJson) {
        this.progressJson = progressJson;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public OffsetDateTime getEnrolledAt() {
        return enrolledAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
