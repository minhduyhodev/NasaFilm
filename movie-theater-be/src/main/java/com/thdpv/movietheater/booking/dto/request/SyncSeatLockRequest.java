package com.thdpv.movietheater.booking.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public class SyncSeatLockRequest {

    @NotNull(message = "Showtime uuid khong duoc de trong")
    private UUID showtimeUuid;

    private List<UUID> seatUuids;

    public SyncSeatLockRequest() {
    }

    public SyncSeatLockRequest(UUID showtimeUuid, List<UUID> seatUuids) {
        this.showtimeUuid = showtimeUuid;
        this.seatUuids = seatUuids;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public List<UUID> getSeatUuids() {
        return seatUuids;
    }

    public void setSeatUuids(List<UUID> seatUuids) {
        this.seatUuids = seatUuids;
    }
}
