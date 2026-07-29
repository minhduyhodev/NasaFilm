package com.thdpv.movietheater.auth.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.auth.entity.UserSession;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    Optional<UserSession> findByPreviousRefreshTokenHash(String previousRefreshTokenHash);

    List<UserSession> findByUserIdAndStatus(UUID userId, String status);

    Optional<UserSession> findFirstByUserIdAndUserAgent(UUID userId, String userAgent);

    void deleteByExpiredAtBeforeOrRevokedAtBefore(LocalDateTime expiredAt, LocalDateTime revokedAt);

    void deleteByExpiredAtBeforeOrStatus(LocalDateTime expiredAt, String status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserSession s SET s.status = 'REVOKED', s.revokedAt = :now "
            + "WHERE s.userId = :userId AND s.status = 'ACTIVE'")
    int revokeAllActiveSessions(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    /**
     * Atomic refresh rotation. Returns 0 when the presented hash was already rotated away
     * (concurrent refresh or stolen-token race).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserSession s SET s.previousRefreshTokenHash = s.refreshTokenHash, "
            + "s.refreshTokenHash = :newHash, s.expiredAt = :expiredAt, s.lastActivityAt = :now, "
            + "s.ipAddress = :ipAddress, s.userAgent = :userAgent, s.deviceInfo = :userAgent "
            + "WHERE s.id = :sessionId AND s.refreshTokenHash = :oldHash AND s.status = 'ACTIVE'")
    int rotateRefreshToken(@Param("sessionId") UUID sessionId,
            @Param("oldHash") String oldHash,
            @Param("newHash") String newHash,
            @Param("expiredAt") LocalDateTime expiredAt,
            @Param("now") LocalDateTime now,
            @Param("ipAddress") String ipAddress,
            @Param("userAgent") String userAgent);
}
