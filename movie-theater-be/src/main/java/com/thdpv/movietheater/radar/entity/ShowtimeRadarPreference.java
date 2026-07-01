package com.thdpv.movietheater.radar.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "showtime_radar_preference")
public class ShowtimeRadarPreference {

    @Id
    @Column(name = "user_uuid", nullable = false, updatable = false)
    private UUID userUuid;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "genre_uuids", columnDefinition = "text")
    private String genreUuids;

    @Column(name = "time_slot_start_hour")
    private Integer timeSlotStartHour;

    @Column(name = "time_slot_end_hour")
    private Integer timeSlotEndHour;

    @Column(name = "include_favorites", nullable = false)
    private boolean includeFavorites = true;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    public ShowtimeRadarPreference() {
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getGenreUuids() {
        return genreUuids;
    }

    public void setGenreUuids(String genreUuids) {
        this.genreUuids = genreUuids;
    }

    public Integer getTimeSlotStartHour() {
        return timeSlotStartHour;
    }

    public void setTimeSlotStartHour(Integer timeSlotStartHour) {
        this.timeSlotStartHour = timeSlotStartHour;
    }

    public Integer getTimeSlotEndHour() {
        return timeSlotEndHour;
    }

    public void setTimeSlotEndHour(Integer timeSlotEndHour) {
        this.timeSlotEndHour = timeSlotEndHour;
    }

    public boolean isIncludeFavorites() {
        return includeFavorites;
    }

    public void setIncludeFavorites(boolean includeFavorites) {
        this.includeFavorites = includeFavorites;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(OffsetDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }
}
