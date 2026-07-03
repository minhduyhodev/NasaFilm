package com.thdpv.movietheater.staff.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "staff_gate_event",
        indexes = {
                @Index(name = "idx_staff_gate_event_showtime", columnList = "showtime_uuid,created_at"),
                @Index(name = "idx_staff_gate_event_ticket", columnList = "ticket_code,created_at"),
                @Index(name = "idx_staff_gate_event_staff", columnList = "staff_uuid,created_at")
        })
public class StaffGateEvent {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "showtime_uuid")
    private UUID showtimeUuid;

    @Column(name = "booking_uuid")
    private UUID bookingUuid;

    @Column(name = "ticket_code", nullable = false, length = 64)
    private String ticketCode;

    @Column(name = "event_type", nullable = false, length = 48)
    private String eventType;

    @Column(name = "staff_uuid")
    private UUID staffUuid;

    @Column(name = "staff_email", length = 255)
    private String staffEmail;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(name = "movie_title", length = 255)
    private String movieTitle;

    @Column(name = "seat_labels", columnDefinition = "TEXT")
    private String seatLabels;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "scan_source", length = 16)
    private String scanSource;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

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

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public void setTicketCode(String ticketCode) {
        this.ticketCode = ticketCode;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public UUID getStaffUuid() {
        return staffUuid;
    }

    public void setStaffUuid(UUID staffUuid) {
        this.staffUuid = staffUuid;
    }

    public String getStaffEmail() {
        return staffEmail;
    }

    public void setStaffEmail(String staffEmail) {
        this.staffEmail = staffEmail;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getSeatLabels() {
        return seatLabels;
    }

    public void setSeatLabels(String seatLabels) {
        this.seatLabels = seatLabels;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getScanSource() {
        return scanSource;
    }

    public void setScanSource(String scanSource) {
        this.scanSource = scanSource;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
