package com.thdpv.movietheater.support.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class SupportAiSessionResponse {
    private UUID uuid;
    private String sessionCode;
    private String ownerEmail;
    private String ownerName;
    private String mode;
    private String title;
    private String lastMessage;
    private String lastRole;
    private int messageCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public UUID getUuid() { return uuid; }
    public void setUuid(UUID uuid) { this.uuid = uuid; }
    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public String getLastRole() { return lastRole; }
    public void setLastRole(String lastRole) { this.lastRole = lastRole; }
    public int getMessageCount() { return messageCount; }
    public void setMessageCount(int messageCount) { this.messageCount = messageCount; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
