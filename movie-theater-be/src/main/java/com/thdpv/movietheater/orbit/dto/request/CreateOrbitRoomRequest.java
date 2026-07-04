package com.thdpv.movietheater.orbit.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class CreateOrbitRoomRequest {

    @NotNull(message = "Showtime uuid khong duoc de trong")
    private UUID showtimeUuid;

    @Min(value = 2, message = "Phong Orbit can it nhat 2 thanh vien")
    @Max(value = 8, message = "Phong Orbit toi da 8 thanh vien")
    private int maxMembers = 8;

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public int getMaxMembers() {
        return maxMembers;
    }

    public void setMaxMembers(int maxMembers) {
        this.maxMembers = maxMembers;
    }
}
