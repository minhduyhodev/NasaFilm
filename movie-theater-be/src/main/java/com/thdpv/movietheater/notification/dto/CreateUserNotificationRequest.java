package com.thdpv.movietheater.notification.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateUserNotificationRequest {

    @NotBlank
    private String title;

    private String content;

    private String type = "info";

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
