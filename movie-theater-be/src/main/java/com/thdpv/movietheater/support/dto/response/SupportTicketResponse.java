package com.thdpv.movietheater.support.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class SupportTicketResponse {

    private UUID uuid;
    private String ticketCode;
    private String ownerEmail;
    private String ownerName;
    private String category;
    private String description;
    private String status;
    private boolean readByAdmin;
    private boolean replied;
    private String answer;
    private String adminNote;
    private String lastMessage;
    private String lastMessageSender;
    private boolean liveRequested;
    private boolean liveConnected;
    private String assignedStaffEmail;
    private String assignedStaffName;
    private Integer satisfactionRating;
    private String satisfactionLabel;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public void setTicketCode(String ticketCode) {
        this.ticketCode = ticketCode;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public void setOwnerEmail(String ownerEmail) {
        this.ownerEmail = ownerEmail;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isReadByAdmin() {
        return readByAdmin;
    }

    public void setReadByAdmin(boolean readByAdmin) {
        this.readByAdmin = readByAdmin;
    }

    public boolean isReplied() {
        return replied;
    }

    public void setReplied(boolean replied) {
        this.replied = replied;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(String lastMessage) {
        this.lastMessage = lastMessage;
    }

    public String getLastMessageSender() {
        return lastMessageSender;
    }

    public void setLastMessageSender(String lastMessageSender) {
        this.lastMessageSender = lastMessageSender;
    }

    public boolean isLiveRequested() {
        return liveRequested;
    }

    public void setLiveRequested(boolean liveRequested) {
        this.liveRequested = liveRequested;
    }

    public boolean isLiveConnected() {
        return liveConnected;
    }

    public void setLiveConnected(boolean liveConnected) {
        this.liveConnected = liveConnected;
    }

    public String getAssignedStaffEmail() {
        return assignedStaffEmail;
    }

    public void setAssignedStaffEmail(String assignedStaffEmail) {
        this.assignedStaffEmail = assignedStaffEmail;
    }

    public String getAssignedStaffName() {
        return assignedStaffName;
    }

    public void setAssignedStaffName(String assignedStaffName) {
        this.assignedStaffName = assignedStaffName;
    }

    public Integer getSatisfactionRating() {
        return satisfactionRating;
    }

    public void setSatisfactionRating(Integer satisfactionRating) {
        this.satisfactionRating = satisfactionRating;
    }

    public String getSatisfactionLabel() {
        return satisfactionLabel;
    }

    public void setSatisfactionLabel(String satisfactionLabel) {
        this.satisfactionLabel = satisfactionLabel;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
