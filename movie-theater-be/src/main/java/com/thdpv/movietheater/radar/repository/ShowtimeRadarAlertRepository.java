package com.thdpv.movietheater.radar.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.radar.entity.ShowtimeRadarAlert;

@Repository
public interface ShowtimeRadarAlertRepository extends JpaRepository<ShowtimeRadarAlert, UUID> {

    boolean existsByUserUuidAndShowtimeUuidAndDeletedAtIsNull(UUID userUuid, UUID showtimeUuid);

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
