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
import com.thdpv.movietheater.preshow.dto.PreShowReminderCandidate;
import com.thdpv.movietheater.preshow.dto.TheaterBoardingContext;

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

    @Query("""
            SELECT b FROM Booking b
            JOIN Showtime s ON s.uuid = b.showtimeUuid
            WHERE UPPER(b.status) = 'CONFIRMED'
              AND (b.bookingType IS NULL OR UPPER(b.bookingType) = 'THEATER')
              AND b.showtimeUuid IS NOT NULL
              AND s.startTime > :now
              AND s.startTime <= :until
            """)
    List<Booking> findUpcomingTheaterBookings(
            @Param("now") OffsetDateTime now,
            @Param("until") OffsetDateTime until);

    @Query("""
            SELECT new com.thdpv.movietheater.preshow.dto.PreShowReminderCandidate(
                b.uuid,
                b.userUuid,
                s.startTime,
                m.title,
                c.name,
                c.latitude,
                c.longitude,
                c.address)
            FROM Booking b
            JOIN Showtime s ON s.uuid = b.showtimeUuid
            JOIN Movie m ON m.uuid = s.movieUuid
            JOIN CinemaRoom r ON r.uuid = s.cinemaRoomUuid
            JOIN r.cinema c
            WHERE UPPER(b.status) = 'CONFIRMED'
              AND (b.bookingType IS NULL OR UPPER(b.bookingType) = 'THEATER')
              AND b.showtimeUuid IS NOT NULL
              AND s.startTime > :now
              AND s.startTime <= :until
            """)
    List<PreShowReminderCandidate> findUpcomingTheaterReminderCandidates(
            @Param("now") OffsetDateTime now,
            @Param("until") OffsetDateTime until);

    @Query("""
            SELECT new com.thdpv.movietheater.preshow.dto.TheaterBoardingContext(
                b.uuid,
                b.userUuid,
                b.status,
                b.bookingType,
                s.movieUuid,
                s.startTime,
                s.endTime,
                m.title,
                c.name,
                c.address,
                c.entranceNote,
                c.latitude,
                c.longitude,
                r.name,
                u.score)
            FROM Booking b
            JOIN Showtime s ON s.uuid = b.showtimeUuid
            JOIN Movie m ON m.uuid = s.movieUuid
            JOIN CinemaRoom r ON r.uuid = s.cinemaRoomUuid
            JOIN r.cinema c
            JOIN User u ON u.id = b.userUuid
            WHERE b.uuid = :bookingUuid
            """)
    java.util.Optional<TheaterBoardingContext> findTheaterBoardingContext(@Param("bookingUuid") UUID bookingUuid);
}
