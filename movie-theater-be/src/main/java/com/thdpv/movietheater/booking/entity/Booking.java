package com.thdpv.movietheater.booking.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "booking",
        indexes = {
                @Index(name = "idx_booking_user", columnList = "user_uuid"),
                @Index(name = "idx_booking_showtime", columnList = "showtime_uuid"),
                @Index(name = "idx_booking_promotion", columnList = "promotion_uuid")
        })
public class Booking {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "showtime_uuid")
    private UUID showtimeUuid;

    @Column(name = "promotion_uuid")
    private UUID promotionUuid;

    @Column(name = "booking_type")
    private String bookingType = "THEATER";

    @Column(name = "movie_uuid")
    private UUID movieUuid;

    @Column(name = "first_played_at")
    private OffsetDateTime firstPlayedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "stream_token")
    private String streamToken;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "expired_at")
    private OffsetDateTime expiredAt;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public Booking() {
    }

    public Booking(UUID uuid, UUID userUuid, UUID showtimeUuid, BigDecimal totalPrice, String status,
            OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime confirmedAt, UUID createdBy,
            UUID updatedBy) {
        this.uuid = uuid;
        this.userUuid = userUuid;
        this.showtimeUuid = showtimeUuid;
        this.totalPrice = totalPrice;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.confirmedAt = confirmedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

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

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getPromotionUuid() {
        return promotionUuid;
    }

    public void setPromotionUuid(UUID promotionUuid) {
        this.promotionUuid = promotionUuid;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
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

    public OffsetDateTime getExpiredAt() {
        return expiredAt;
    }

    public void setExpiredAt(OffsetDateTime expiredAt) {
        this.expiredAt = expiredAt;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public OffsetDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(OffsetDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
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

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public OffsetDateTime getFirstPlayedAt() {
        return firstPlayedAt;
    }

    public void setFirstPlayedAt(OffsetDateTime firstPlayedAt) {
        this.firstPlayedAt = firstPlayedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getStreamToken() {
        return streamToken;
    }

    public void setStreamToken(String streamToken) {
        this.streamToken = streamToken;
    }
}
