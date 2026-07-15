package com.thdpv.movietheater.support.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class SupportAiMessageResponse {
    private UUID uuid;
    private UUID sessionUuid;
    private String role;
    private String content;
    private List<Map<String, String>> choices;
    private OffsetDateTime createdAt;

    public UUID getUuid() { return uuid; }
    public void setUuid(UUID uuid) { this.uuid = uuid; }
    public UUID getSessionUuid() { return sessionUuid; }
    public void setSessionUuid(UUID sessionUuid) { this.sessionUuid = sessionUuid; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public List<Map<String, String>> getChoices() { return choices; }
    public void setChoices(List<Map<String, String>> choices) { this.choices = choices; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
