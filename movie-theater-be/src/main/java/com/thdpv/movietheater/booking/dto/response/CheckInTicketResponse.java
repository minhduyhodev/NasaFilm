package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class CheckInTicketResponse {

    private String status;
    private String message;
    private UUID ticketUuid;
    private UUID bookingUuid;
    private UUID showtimeUuid;
    private UUID expectedRoomUuid;
    private UUID currentRoomUuid;
    private OffsetDateTime checkedInAt;

    public CheckInTicketResponse() {
    }

    public CheckInTicketResponse(String status, String message, UUID ticketUuid, UUID bookingUuid,
            UUID showtimeUuid, UUID expectedRoomUuid, UUID currentRoomUuid, OffsetDateTime checkedInAt) {
        this.status = status;
        this.message = message;
        this.ticketUuid = ticketUuid;
        this.bookingUuid = bookingUuid;
        this.showtimeUuid = showtimeUuid;
        this.expectedRoomUuid = expectedRoomUuid;
        this.currentRoomUuid = currentRoomUuid;
        this.checkedInAt = checkedInAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public UUID getTicketUuid() {
        return ticketUuid;
    }

    public void setTicketUuid(UUID ticketUuid) {
        this.ticketUuid = ticketUuid;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getExpectedRoomUuid() {
        return expectedRoomUuid;
    }

    public void setExpectedRoomUuid(UUID expectedRoomUuid) {
        this.expectedRoomUuid = expectedRoomUuid;
    }

    public UUID getCurrentRoomUuid() {
        return currentRoomUuid;
    }

    public void setCurrentRoomUuid(UUID currentRoomUuid) {
        this.currentRoomUuid = currentRoomUuid;
    }

    public OffsetDateTime getCheckedInAt() {
        return checkedInAt;
    }

    public void setCheckedInAt(OffsetDateTime checkedInAt) {
        this.checkedInAt = checkedInAt;
    }
}
