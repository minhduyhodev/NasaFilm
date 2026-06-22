package com.thdpv.movietheater.notification.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.notification.entity.EmailTemplate;

public class EmailTemplateResponse {

    private UUID id;
    private String code;
    private String name;
    private String purpose;
    private String subject;
    private String htmlBody;
    private boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static EmailTemplateResponse from(EmailTemplate template) {
        EmailTemplateResponse response = new EmailTemplateResponse();
        response.id = template.getId();
        response.code = template.getCode();
        response.name = template.getName();
        response.purpose = template.getPurpose();
        response.subject = template.getSubject();
        response.htmlBody = template.getHtmlBody();
        response.active = template.isActive();
        response.createdAt = template.getCreatedAt();
        response.updatedAt = template.getUpdatedAt();
        return response;
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getSubject() {
        return subject;
    }

    public String getHtmlBody() {
        return htmlBody;
    }

    public boolean isActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
