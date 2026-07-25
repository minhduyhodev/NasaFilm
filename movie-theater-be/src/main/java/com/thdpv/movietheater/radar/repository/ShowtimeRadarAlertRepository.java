package com.thdpv.movietheater.radar.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.radar.entity.ShowtimeRadarAlert;

public interface ShowtimeRadarAlertRepository extends JpaRepository<ShowtimeRadarAlert, UUID> {

    boolean existsByUserUuidAndShowtimeUuidAndDeletedAtIsNull(UUID userUuid, UUID showtimeUuid);

    @Query("""
            SELECT a.showtimeUuid FROM ShowtimeRadarAlert a
            WHERE a.userUuid = :userUuid
              AND a.deletedAt IS NULL
            """)
    List<UUID> findActiveShowtimeUuidsByUserUuid(@Param("userUuid") UUID userUuid);

    @Query("""
            SELECT a FROM ShowtimeRadarAlert a
            WHERE a.userUuid IN :userUuids
              AND a.deletedAt IS NULL
            """)
    List<ShowtimeRadarAlert> findActiveByUserUuidIn(@Param("userUuids") Collection<UUID> userUuids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ShowtimeRadarAlert a
            SET a.deletedAt = :now
            WHERE a.deletedAt IS NULL
              AND a.showtimeUuid IN :showtimeUuids
            """)
    int softDeleteByShowtimeUuids(
            @Param("showtimeUuids") Collection<UUID> showtimeUuids,
            @Param("now") OffsetDateTime now);
}
