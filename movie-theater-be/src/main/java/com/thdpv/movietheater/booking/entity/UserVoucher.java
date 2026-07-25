package com.thdpv.movietheater.booking.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_voucher")
public class UserVoucher {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "promotion_uuid", nullable = false)
    private UUID promotionUuid;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "redeemed_at", nullable = false)
    private OffsetDateTime redeemedAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "booking_uuid")
    private UUID bookingUuid;

    public UserVoucher() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public UUID getPromotionUuid() {
        return promotionUuid;
    }

    public void setPromotionUuid(UUID promotionUuid) {
        this.promotionUuid = promotionUuid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getRedeemedAt() {
        return redeemedAt;
    }

    public void setRedeemedAt(OffsetDateTime redeemedAt) {
        this.redeemedAt = redeemedAt;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(OffsetDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }
}
