package com.thdpv.movietheater.booking.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_entity", columnList = "entity_type,entity_uuid"),
        @Index(name = "idx_audit_actor", columnList = "actor_uuid")
})
public class AuditLog {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_uuid", nullable = false)
    private UUID entityUuid;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "actor_uuid")
    private UUID actorUuid;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public AuditLog() {
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public UUID getEntityUuid() {
        return entityUuid;
    }

    public void setEntityUuid(UUID entityUuid) {
        this.entityUuid = entityUuid;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public UUID getActorUuid() {
        return actorUuid;
    }

    public void setActorUuid(UUID actorUuid) {
        this.actorUuid = actorUuid;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
