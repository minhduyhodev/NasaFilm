package com.thdpv.movietheater.orbit.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class OrbitRoomResponse {

    private UUID uuid;
    private UUID showtimeUuid;
    private UUID hostUserUuid;
    private int maxMembers;
    private String status;
    private OffsetDateTime expiresAt;
    private UUID bookingUuid;
    private boolean host;
    private String sharePath;
    private List<OrbitMemberResponse> members = new ArrayList<>();

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getHostUserUuid() {
        return hostUserUuid;
    }

    public void setHostUserUuid(UUID hostUserUuid) {
        this.hostUserUuid = hostUserUuid;
    }

    public int getMaxMembers() {
        return maxMembers;
    }

    public void setMaxMembers(int maxMembers) {
        this.maxMembers = maxMembers;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public boolean isHost() {
        return host;
    }

    public void setHost(boolean host) {
        this.host = host;
    }

    public String getSharePath() {
        return sharePath;
    }

    public void setSharePath(String sharePath) {
        this.sharePath = sharePath;
    }

    public List<OrbitMemberResponse> getMembers() {
        return members;
    }

    public void setMembers(List<OrbitMemberResponse> members) {
        this.members = members;
    }
}
