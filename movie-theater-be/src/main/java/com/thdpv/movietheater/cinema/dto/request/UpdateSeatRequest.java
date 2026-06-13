package com.thdpv.movietheater.cinema.dto.request;

import com.thdpv.movietheater.cinema.enums.SeatStatus;
import java.util.UUID;

public class UpdateSeatRequest {

    private UUID seatTypeUuid;
    private SeatStatus status;

    public UpdateSeatRequest() {
    }

    public UpdateSeatRequest(UUID seatTypeUuid, SeatStatus status) {
        this.seatTypeUuid = seatTypeUuid;
        this.status = status;
    }

    public UUID getSeatTypeUuid() {
        return seatTypeUuid;
    }

    public void setSeatTypeUuid(UUID seatTypeUuid) {
        this.seatTypeUuid = seatTypeUuid;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }
}
