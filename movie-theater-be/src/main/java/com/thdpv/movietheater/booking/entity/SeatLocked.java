package com.thdpv.movietheater.booking.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "seat_locked",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_seatlocked_showtime_seat", columnNames = {"showtime_uuid", "seat_uuid"})
        },
        indexes = {
                @Index(name = "idx_seatlocked_user", columnList = "user_uuid"),
                @Index(name = "idx_seatlocked_showtime_expired", columnList = "showtime_uuid, expired_at"),
                @Index(name = "idx_seatlocked_expired_at", columnList = "expired_at")
        })
public class SeatLocked {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "showtime_uuid", nullable = false)
    private UUID showtimeUuid;

    @Column(name = "seat_uuid", nullable = false)
    private UUID seatUuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "locked_at", nullable = false)
    private OffsetDateTime lockedAt;

    @Column(name = "expired_at", nullable = false)
    private OffsetDateTime expiredAt;

    public SeatLocked() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getSeatUuid() {
        return seatUuid;
    }

    public void setSeatUuid(UUID seatUuid) {
        this.seatUuid = seatUuid;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public OffsetDateTime getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(OffsetDateTime lockedAt) {
        this.lockedAt = lockedAt;
    }

    public OffsetDateTime getExpiredAt() {
        return expiredAt;
    }

    public void setExpiredAt(OffsetDateTime expiredAt) {
        this.expiredAt = expiredAt;
    }
}
