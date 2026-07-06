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
        name = "user_permissions",
        indexes = {
                @Index(name = "idx_user_permissions_user_id", columnList = "user_id"),
                @Index(name = "idx_user_permissions_permission_id", columnList = "permission_id"),
                @Index(name = "uk_user_permissions_user_permission", columnList = "user_id,permission_id", unique = true)
        })
public class UserPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "permission_id", nullable = false)
    private UUID permissionId;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public UserPermission() {
    }

    public UserPermission(UUID id, UUID userId, UUID permissionId, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.permissionId = permissionId;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
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
