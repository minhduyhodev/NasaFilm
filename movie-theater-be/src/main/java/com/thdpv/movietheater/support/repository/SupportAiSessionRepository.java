package com.thdpv.movietheater.support.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportAiSession;

public interface SupportAiSessionRepository extends JpaRepository<SupportAiSession, UUID> {

    Optional<SupportAiSession> findBySessionCode(String sessionCode);

    List<SupportAiSession> findByOwnerEmailIgnoreCaseOrderByUpdatedAtDesc(String ownerEmail);

    boolean existsBySessionCode(String sessionCode);
}
