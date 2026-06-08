package com.thdpv.movietheater.user.dto;

import com.thdpv.movietheater.user.enums.RoleName;
import jakarta.validation.constraints.NotNull;

public class UpdateRoleRequest {

    @NotNull(message = "Vai trò không được để trống")
    private RoleName roleName;

    public RoleName getRoleName() {
        return roleName;
    }

    public void setRoleName(RoleName roleName) {
        this.roleName = roleName;
    }
}
