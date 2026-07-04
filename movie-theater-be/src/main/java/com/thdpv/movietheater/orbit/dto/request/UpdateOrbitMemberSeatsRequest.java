package com.thdpv.movietheater.orbit.dto.request;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class UpdateOrbitMemberSeatsRequest {

    private List<UUID> seatUuids = new ArrayList<>();

    public List<UUID> getSeatUuids() {
        return seatUuids;
    }

    public void setSeatUuids(List<UUID> seatUuids) {
        this.seatUuids = seatUuids != null ? seatUuids : new ArrayList<>();
    }
}
