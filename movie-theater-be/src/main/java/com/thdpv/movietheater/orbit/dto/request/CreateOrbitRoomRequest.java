package com.thdpv.movietheater.orbit.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class CreateOrbitRoomRequest {

    @NotNull(message = "Suất chiếu không được để trống")
    private UUID showtimeUuid;

    @Min(value = 2, message = "Phòng Orbit cần ít nhất 2 thành viên")
    @Max(value = 8, message = "Phòng Orbit tối đa 8 thành viên")
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
