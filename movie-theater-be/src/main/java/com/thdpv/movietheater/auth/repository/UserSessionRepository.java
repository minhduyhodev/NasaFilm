package com.thdpv.movietheater.auth.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.auth.entity.UserSession;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    List<UserSession> findByUserIdAndStatus(UUID userId, String status);

    Optional<UserSession> findFirstByUserIdAndUserAgent(UUID userId, String userAgent);

    void deleteByExpiredAtBeforeOrRevokedAtBefore(LocalDateTime expiredAt, LocalDateTime revokedAt);

    void deleteByExpiredAtBeforeOrStatus(LocalDateTime expiredAt, String status);
}
