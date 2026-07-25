package com.thdpv.movietheater.user.dto;

import java.util.ArrayList;
import java.util.List;

public class UpdateUserPermissionsRequest {

    private List<String> permissions = new ArrayList<>();

    public UpdateUserPermissionsRequest() {
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }
}
