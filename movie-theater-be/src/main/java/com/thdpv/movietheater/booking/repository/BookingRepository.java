package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.Booking;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    boolean existsByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    long countByUserUuidAndPromotionUuid(UUID userUuid, UUID promotionUuid);

    @Query("""
            SELECT b.promotionUuid, COUNT(b)
            FROM Booking b
            WHERE b.userUuid = :userUuid AND b.promotionUuid IN :promotionUuids
            GROUP BY b.promotionUuid
            """)
    List<Object[]> countByUserAndPromotionGroup(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids);

    @Query("""
            SELECT DISTINCT b.promotionUuid
            FROM Booking b
            WHERE b.userUuid = :userUuid AND b.promotionUuid IN :promotionUuids
            """)
    List<UUID> findUsedPromotionUuidsForUser(
            @Param("userUuid") UUID userUuid,
            @Param("promotionUuids") Collection<UUID> promotionUuids);

    List<Booking> findByShowtimeUuid(UUID showtimeUuid);
    java.util.Optional<Booking> findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(UUID userUuid, UUID movieUuid, String bookingType, String status);
    List<Booking> findByUserUuidAndMovieUuidAndBookingTypeAndStatus(UUID userUuid, UUID movieUuid, String bookingType, String status);
    List<Booking> findByUserUuidAndBookingTypeAndStatus(UUID userUuid, String bookingType, String status);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.userUuid = :userUuid
              AND b.movieUuid IN :movieUuids
              AND b.bookingType = 'ONLINE'
              AND b.status = 'CONFIRMED'
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findOnlineConfirmedBookingsForUserAndMovies(
            @Param("userUuid") UUID userUuid,
            @Param("movieUuids") Collection<UUID> movieUuids);

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM Booking b
            WHERE b.userUuid = :userUuid
              AND UPPER(b.status) = 'CONFIRMED'
              AND (
                (UPPER(b.bookingType) = 'ONLINE' AND b.movieUuid = :movieUuid)
                OR (
                  (b.bookingType IS NULL OR UPPER(b.bookingType) = 'THEATER')
                  AND b.showtimeUuid IN (
                    SELECT s.uuid FROM Showtime s WHERE s.movieUuid = :movieUuid
                  )
                )
              )
            """)
    boolean hasConfirmedPurchaseForMovie(
            @Param("userUuid") UUID userUuid,
            @Param("movieUuid") UUID movieUuid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Booking b set b.status = :newStatus, b.updatedAt = :now where b.uuid = :uuid and b.status = :expectedStatus")
    int updateStatusIf(@Param("uuid") UUID uuid,
            @Param("expectedStatus") String expectedStatus,
            @Param("newStatus") String newStatus,
            @Param("now") OffsetDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Booking b
            SET b.streamToken = null, b.updatedAt = :now
            WHERE UPPER(b.bookingType) = 'ONLINE'
              AND UPPER(b.status) = 'CONFIRMED'
              AND b.firstPlayedAt IS NOT NULL
              AND b.expiresAt <= :now
              AND b.streamToken IS NOT NULL
            """)
    int revokeExpiredVodStreamTokens(@Param("now") OffsetDateTime now);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.userUuid = :userUuid
              AND b.bookingType = 'ONLINE'
              AND b.status = 'CONFIRMED'
              AND b.firstPlayedAt IS NOT NULL
              AND b.vodPositionSeconds IS NOT NULL
              AND b.vodPositionSeconds > 0
              AND (b.expiresAt IS NULL OR b.expiresAt > :now)
            ORDER BY b.vodLastWatchedAt DESC NULLS LAST, b.updatedAt DESC
            """)
    List<Booking> findVodWatchHistory(
            @Param("userUuid") UUID userUuid,
            @Param("now") OffsetDateTime now);
}
