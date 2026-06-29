package com.thdpv.movietheater.booking.entity;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;

@Entity
@Table(name = "showtime", indexes = {
        @Index(name = "idx_showtime_movie", columnList = "movie_uuid"),
        @Index(name = "idx_showtime_room", columnList = "cinema_room_uuid"),
        @Index(name = "idx_showtime_status_start", columnList = "status, start_time"),
        @Index(name = "idx_showtime_room_start_status", columnList = "cinema_room_uuid, start_time, status"),
        @Index(name = "idx_showtime_movie_status_start", columnList = "movie_uuid, status, start_time"),
        @Index(name = "idx_showtime_start_time", columnList = "start_time")
})
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "movie_uuid", nullable = false)
    private UUID movieUuid;

    @Column(name = "cinema_room_uuid", nullable = false)
    private UUID cinemaRoomUuid;

    @Column(name = "start_time", nullable = false)
    private OffsetDateTime startTime;

    @Column(name = "end_time")
    private OffsetDateTime endTime;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;

    @Column(name = "vip_price")
    private BigDecimal vipPrice;

    @Column(name = "couple_price")
    private BigDecimal couplePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ShowtimeStatus status = ShowtimeStatus.DRAFT;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Showtime() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public UUID getCinemaRoomUuid() {
        return cinemaRoomUuid;
    }

    public void setCinemaRoomUuid(UUID cinemaRoomUuid) {
        this.cinemaRoomUuid = cinemaRoomUuid;
    }

    public OffsetDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(OffsetDateTime startTime) {
        this.startTime = startTime;
    }

    public OffsetDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(OffsetDateTime endTime) {
        this.endTime = endTime;
    }

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public BigDecimal getVipPrice() {
        return vipPrice;
    }

    public void setVipPrice(BigDecimal vipPrice) {
        this.vipPrice = vipPrice;
    }

    public BigDecimal getCouplePrice() {
        return couplePrice;
    }

    public void setCouplePrice(BigDecimal couplePrice) {
        this.couplePrice = couplePrice;
    }

    public ShowtimeStatus getStatus() {
        return status;
    }

    public void setStatus(ShowtimeStatus status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
