package com.thdpv.movietheater.mission.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "user_badge",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_badge_user_code",
                columnNames = { "user_uuid", "badge_code" }))
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "badge_code", nullable = false, length = 64)
    private String badgeCode;

    @Column(name = "badge_title", nullable = false, length = 120)
    private String badgeTitle;

    @Column(name = "source_user_mission_uuid")
    private UUID sourceUserMissionUuid;

    @Column(name = "unlocked_at", nullable = false)
    private OffsetDateTime unlockedAt;

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

    public String getBadgeCode() {
        return badgeCode;
    }

    public void setBadgeCode(String badgeCode) {
        this.badgeCode = badgeCode;
    }

    public String getBadgeTitle() {
        return badgeTitle;
    }

    public void setBadgeTitle(String badgeTitle) {
        this.badgeTitle = badgeTitle;
    }

    public UUID getSourceUserMissionUuid() {
        return sourceUserMissionUuid;
    }

    public void setSourceUserMissionUuid(UUID sourceUserMissionUuid) {
        this.sourceUserMissionUuid = sourceUserMissionUuid;
    }

    public OffsetDateTime getUnlockedAt() {
        return unlockedAt;
    }

    public void setUnlockedAt(OffsetDateTime unlockedAt) {
        this.unlockedAt = unlockedAt;
    }
}
