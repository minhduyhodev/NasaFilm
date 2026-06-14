package com.thdpv.movietheater.auth.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.auth.entity.UserSession;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    List<UserSession> findByUserIdAndStatus(UUID userId, String status);

    Optional<UserSession> findFirstByUserIdAndUserAgentAndStatus(UUID userId, String userAgent, String status);

    void deleteByExpiredAtBeforeOrRevokedAtBefore(LocalDateTime expiredAt, LocalDateTime revokedAt);
}
