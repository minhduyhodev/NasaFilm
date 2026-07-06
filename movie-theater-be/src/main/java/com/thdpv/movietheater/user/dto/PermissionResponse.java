package com.thdpv.movietheater.user.dto;

public class PermissionResponse {

    private String name;
    private String description;
    private String group;

    public PermissionResponse() {
    }

    public PermissionResponse(String name, String description, String group) {
        this.name = name;
        this.description = description;
        this.group = group;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }
}
