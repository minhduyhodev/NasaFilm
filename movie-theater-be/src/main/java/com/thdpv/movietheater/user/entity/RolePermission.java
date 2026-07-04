package com.thdpv.movietheater.user.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "role_permissions",
        indexes = {
                @Index(name = "idx_role_permissions_role_id", columnList = "role_id"),
                @Index(name = "idx_role_permissions_permission_id", columnList = "permission_id"),
                @Index(name = "uk_role_permissions_role_permission", columnList = "role_id,permission_id", unique = true)
        })
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Column(name = "permission_id", nullable = false)
    private UUID permissionId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public RolePermission() {
    }

    public RolePermission(UUID id, UUID roleId, UUID permissionId, LocalDateTime createdAt) {
        this.id = id;
        this.roleId = roleId;
        this.permissionId = permissionId;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public void setRoleId(UUID roleId) {
        this.roleId = roleId;
    }

    public UUID getPermissionId() {
        return permissionId;
    }

    public void setPermissionId(UUID permissionId) {
        this.permissionId = permissionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
