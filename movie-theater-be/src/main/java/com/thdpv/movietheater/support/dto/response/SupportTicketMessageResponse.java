package com.thdpv.movietheater.support.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class SupportTicketMessageResponse {
    private UUID uuid;
    private UUID ticketUuid;
    private String senderRole;
    private String senderName;
    private String message;
    private OffsetDateTime createdAt;

    public UUID getUuid() { return uuid; }
    public void setUuid(UUID uuid) { this.uuid = uuid; }
    public UUID getTicketUuid() { return ticketUuid; }
    public void setTicketUuid(UUID ticketUuid) { this.ticketUuid = ticketUuid; }
    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
