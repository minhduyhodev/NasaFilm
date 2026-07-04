package com.thdpv.movietheater.orbit.dto.response;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class OrbitCheckoutPrepareResponse {

    private UUID orbitRoomUuid;
    private UUID showtimeUuid;
    private List<UUID> seatUuids = new ArrayList<>();
    private List<OrbitMemberResponse> members = new ArrayList<>();

    public UUID getOrbitRoomUuid() {
        return orbitRoomUuid;
    }

    public void setOrbitRoomUuid(UUID orbitRoomUuid) {
        this.orbitRoomUuid = orbitRoomUuid;
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

    public List<OrbitMemberResponse> getMembers() {
        return members;
    }

    public void setMembers(List<OrbitMemberResponse> members) {
        this.members = members;
    }
}
