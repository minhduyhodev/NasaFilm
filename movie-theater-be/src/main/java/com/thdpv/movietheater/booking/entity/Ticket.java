package com.thdpv.movietheater.booking.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "ticket",
        indexes = {
                @Index(name = "idx_ticket_booking", columnList = "booking_uuid")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_ticket_booking_seat", columnNames = {"booking_seat_uuid"}),
                @UniqueConstraint(name = "uk_ticket_code", columnNames = {"ticket_code"})
        })
public class Ticket {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "booking_uuid", nullable = false)
    private UUID bookingUuid;

    @Column(name = "booking_seat_uuid", nullable = false, unique = true)
    private UUID bookingSeatUuid;

    @Column(name = "ticket_code", nullable = false, unique = true)
    private String ticketCode;

    @Column(name = "qr_code")
    private String qrCode;

    @Column(name = "status")
    private String status;

    @Column(name = "issued_at")
    private OffsetDateTime issuedAt;

    @Column(name = "checked_in_at")
    private OffsetDateTime checkedInAt;

    public Ticket() {
    }

    public Ticket(UUID uuid, UUID bookingUuid, UUID bookingSeatUuid, String ticketCode, String qrCode, String status,
            OffsetDateTime issuedAt) {
        this.uuid = uuid;
        this.bookingUuid = bookingUuid;
        this.bookingSeatUuid = bookingSeatUuid;
        this.ticketCode = ticketCode;
        this.qrCode = qrCode;
        this.status = status;
        this.issuedAt = issuedAt;
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

    public UUID getBookingSeatUuid() {
        return bookingSeatUuid;
    }

    public void setBookingSeatUuid(UUID bookingSeatUuid) {
        this.bookingSeatUuid = bookingSeatUuid;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public void setTicketCode(String ticketCode) {
        this.ticketCode = ticketCode;
    }

    public String getQrCode() {
        return qrCode;
    }

    public void setQrCode(String qrCode) {
        this.qrCode = qrCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(OffsetDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }

    public OffsetDateTime getCheckedInAt() {
        return checkedInAt;
    }

    public void setCheckedInAt(OffsetDateTime checkedInAt) {
        this.checkedInAt = checkedInAt;
    }
}
