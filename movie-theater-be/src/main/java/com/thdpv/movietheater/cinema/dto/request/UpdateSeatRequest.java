package com.thdpv.movietheater.cinema.dto.request;

import java.util.UUID;

public class UpdateSeatRequest {

    private UUID seatTypeUuid;
    private String status;

    public UpdateSeatRequest() {
    }

    public UpdateSeatRequest(UUID seatTypeUuid, String status) {
        this.seatTypeUuid = seatTypeUuid;
        this.status = status;
    }

    public UUID getSeatTypeUuid() {
        return seatTypeUuid;
    }

    public void setSeatTypeUuid(UUID seatTypeUuid) {
        this.seatTypeUuid = seatTypeUuid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
