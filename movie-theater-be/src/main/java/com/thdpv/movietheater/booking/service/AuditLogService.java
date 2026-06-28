package com.thdpv.movietheater.booking.service;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.booking.entity.AuditLog;
import com.thdpv.movietheater.booking.repository.AuditLogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(String entityType, UUID entityUuid, String action, UUID actorUuid, String actorRole, Object payload) {
        AuditLog log = new AuditLog();
        log.setUuid(UUID.randomUUID());
        log.setEntityType(entityType);
        log.setEntityUuid(entityUuid);
        log.setAction(action);
        log.setActorUuid(actorUuid);
        log.setActorRole(actorRole);
        log.setCreatedAt(java.time.OffsetDateTime.now());
        if (payload != null) {
            try {
                log.setPayloadJson(objectMapper.writeValueAsString(payload));
            } catch (Exception ignored) {
                log.setPayloadJson(String.valueOf(payload));
            }
        }
        auditLogRepository.save(log);
    }
}
