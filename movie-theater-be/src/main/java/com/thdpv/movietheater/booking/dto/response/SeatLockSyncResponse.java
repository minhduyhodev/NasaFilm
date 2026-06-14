package com.thdpv.movietheater.booking.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SeatLockSyncResponse {

    private UUID showtimeUuid;
    private Integer lockTtlSeconds;
    private OffsetDateTime expiresAt;
    private OffsetDateTime serverTime;
    private List<UUID> lockedSeatUuids = new ArrayList<>();

    public SeatLockSyncResponse() {
    }

    public SeatLockSyncResponse(UUID showtimeUuid, Integer lockTtlSeconds, OffsetDateTime expiresAt,
            List<UUID> lockedSeatUuids) {
        this.showtimeUuid = showtimeUuid;
        this.lockTtlSeconds = lockTtlSeconds;
        this.expiresAt = expiresAt;
        this.lockedSeatUuids = lockedSeatUuids != null ? lockedSeatUuids : new ArrayList<>();
    }

    public SeatLockSyncResponse(UUID showtimeUuid, Integer lockTtlSeconds, OffsetDateTime expiresAt,
            OffsetDateTime serverTime, List<UUID> lockedSeatUuids) {
        this.showtimeUuid = showtimeUuid;
        this.lockTtlSeconds = lockTtlSeconds;
        this.expiresAt = expiresAt;
        this.serverTime = serverTime;
        this.lockedSeatUuids = lockedSeatUuids != null ? lockedSeatUuids : new ArrayList<>();
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public Integer getLockTtlSeconds() {
        return lockTtlSeconds;
    }

    public void setLockTtlSeconds(Integer lockTtlSeconds) {
        this.lockTtlSeconds = lockTtlSeconds;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public OffsetDateTime getServerTime() {
        return serverTime;
    }

    public void setServerTime(OffsetDateTime serverTime) {
        this.serverTime = serverTime;
    }

    public List<UUID> getLockedSeatUuids() {
        return lockedSeatUuids;
    }

    public void setLockedSeatUuids(List<UUID> lockedSeatUuids) {
        this.lockedSeatUuids = lockedSeatUuids;
    }
}
