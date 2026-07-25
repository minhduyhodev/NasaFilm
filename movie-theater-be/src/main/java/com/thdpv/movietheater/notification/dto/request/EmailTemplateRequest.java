package com.thdpv.movietheater.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class EmailTemplateRequest {

    @NotBlank
    @Size(max = 80)
    private String code;

    @NotBlank
    @Size(max = 160)
    private String name;

    @Size(max = 500)
    private String purpose;

    @NotBlank
    @Size(max = 255)
    private String subject;

    private String htmlBody;

    private String contentBlocks;

    private boolean active = true;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getHtmlBody() {
        return htmlBody;
    }

    public void setHtmlBody(String htmlBody) {
        this.htmlBody = htmlBody;
    }

    public String getContentBlocks() {
        return contentBlocks;
    }

    public void setContentBlocks(String contentBlocks) {
        this.contentBlocks = contentBlocks;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
