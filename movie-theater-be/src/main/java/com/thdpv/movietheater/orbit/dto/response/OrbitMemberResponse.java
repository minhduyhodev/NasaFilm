package com.thdpv.movietheater.orbit.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class OrbitMemberResponse {

    private UUID userUuid;
    private String displayName;
    private boolean host;
    private List<UUID> seatUuids = new ArrayList<>();
    private OffsetDateTime joinedAt;

    public UUID getUserUuid() {
        return userUuid;
    }

    public void setUserUuid(UUID userUuid) {
        this.userUuid = userUuid;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public boolean isHost() {
        return host;
    }

    public void setHost(boolean host) {
        this.host = host;
    }

    public List<UUID> getSeatUuids() {
        return seatUuids;
    }

    public void setSeatUuids(List<UUID> seatUuids) {
        this.seatUuids = seatUuids;
    }

    public OffsetDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(OffsetDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
}
