package com.thdpv.movietheater.mission.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.thdpv.movietheater.mission.enums.MissionConditionType;

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
        name = "mission_template",
        uniqueConstraints = @UniqueConstraint(name = "uk_mission_template_code", columnNames = "code"))
public class MissionTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 64)
    private MissionConditionType conditionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "condition_json", columnDefinition = "jsonb")
    private String conditionJson;

    @Column(name = "reward_points", nullable = false)
    private int rewardPoints = 0;

    @Column(name = "reward_badge_code", length = 64)
    private String rewardBadgeCode;

    @Column(name = "reward_badge_title", length = 120)
    private String rewardBadgeTitle;

    @Column(name = "requires_feature", length = 64)
    private String requiresFeature;

    @Column(name = "target_value", nullable = false)
    private int targetValue = 1;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public MissionConditionType getConditionType() {
        return conditionType;
    }

    public void setConditionType(MissionConditionType conditionType) {
        this.conditionType = conditionType;
    }

    public String getConditionJson() {
        return conditionJson;
    }

    public void setConditionJson(String conditionJson) {
        this.conditionJson = conditionJson;
    }

    public int getRewardPoints() {
        return rewardPoints;
    }

    public void setRewardPoints(int rewardPoints) {
        this.rewardPoints = rewardPoints;
    }

    public String getRewardBadgeCode() {
        return rewardBadgeCode;
    }

    public void setRewardBadgeCode(String rewardBadgeCode) {
        this.rewardBadgeCode = rewardBadgeCode;
    }

    public String getRewardBadgeTitle() {
        return rewardBadgeTitle;
    }

    public void setRewardBadgeTitle(String rewardBadgeTitle) {
        this.rewardBadgeTitle = rewardBadgeTitle;
    }

    public String getRequiresFeature() {
        return requiresFeature;
    }

    public void setRequiresFeature(String requiresFeature) {
        this.requiresFeature = requiresFeature;
    }

    public int getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(int targetValue) {
        this.targetValue = targetValue;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
