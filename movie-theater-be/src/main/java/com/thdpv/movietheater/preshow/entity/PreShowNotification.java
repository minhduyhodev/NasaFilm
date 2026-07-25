package com.thdpv.movietheater.preshow.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "pre_show_notification",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_pre_show_notification_booking_type",
                columnNames = { "booking_uuid", "notification_type" }))
public class PreShowNotification {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "notification_type", nullable = false, length = 32)
    private String notificationType;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;

    public PreShowNotification() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
