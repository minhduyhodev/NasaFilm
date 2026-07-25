package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.dto.response.SeatViewDto;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;

public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {

    @Query("""
            SELECT new com.thdpv.movietheater.booking.dto.response.SeatViewDto(
                st.uuid,
                st.cinemaRoomUuid,
                st.startTime,
                st.endTime,
                s.uuid,
                s.rowName,
                s.seatNumber,
                s.status,
                stt.uuid,
                stt.name,
                CASE
                    WHEN UPPER(stt.name) = 'STANDARD' THEN st.basePrice
                    WHEN UPPER(stt.name) = 'VIP' THEN COALESCE(st.vipPrice, stt.basePrice)
                    WHEN UPPER(stt.name) = 'COUPLE' THEN COALESCE(st.couplePrice, stt.basePrice)
                    ELSE stt.basePrice
                END,
                COALESCE(stt.priceModifier, 1.0),
                CASE WHEN b.status = 'CONFIRMED' THEN bs.uuid ELSE NULL END,
                sl.userUuid,
                sl.expiredAt,
                CASE WHEN b.status = 'CONFIRMED' THEN t.checkedInAt ELSE NULL END
            )
            FROM Showtime st
            JOIN Seat s ON s.cinemaRoom.uuid = st.cinemaRoomUuid
            JOIN SeatType stt ON stt.uuid = s.seatType.uuid
            LEFT JOIN BookingSeat bs
                ON bs.showtimeUuid = st.uuid
               AND bs.seatUuid = s.uuid
            LEFT JOIN Booking b ON b.uuid = bs.bookingUuid
            LEFT JOIN Ticket t ON t.bookingSeatUuid = bs.uuid
            LEFT JOIN SeatLocked sl
                ON sl.showtimeUuid = st.uuid
               AND sl.seatUuid = s.uuid
               AND sl.expiredAt > :now
            WHERE st.uuid = :showtimeUuid
              AND s.isActive = true
            ORDER BY s.rowName ASC, s.seatNumber ASC
            """)
    List<SeatViewDto> getShowtimeSeatViews(@Param("showtimeUuid") UUID showtimeUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(s) > 0 FROM Showtime s WHERE s.cinemaRoomUuid = :roomUuid AND s.startTime > :now")
    boolean existsFutureShowtime(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("""
            SELECT COUNT(s) > 0 FROM Showtime s
            WHERE s.cinemaRoomUuid = :roomUuid
              AND s.startTime > :now
              AND s.status IN (
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING,
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.SOLD_OUT
              )
            """)
    boolean existsFutureBookableShowtime(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(b) > 0 FROM Booking b JOIN Showtime s ON s.uuid = b.showtimeUuid WHERE s.cinemaRoomUuid = :roomUuid AND b.status = 'CONFIRMED'")
    boolean existsConfirmedBookingForRoom(@Param("roomUuid") UUID roomUuid);

    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b JOIN Showtime s ON s.uuid = b.showtimeUuid
            WHERE s.cinemaRoomUuid = :roomUuid
              AND upper(b.status) = 'CONFIRMED'
              AND s.endTime > :now
              AND s.status NOT IN (
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.FINISHED,
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.CANCELLED
              )
            """)
    boolean existsFutureConfirmedBookingForRoom(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("SELECT COUNT(s) > 0 FROM Showtime s WHERE s.cinemaRoomUuid = :roomUuid AND s.startTime > :now AND (s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.SCHEDULED OR s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING)")
    boolean existsFutureActiveShowtimes(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.cinemaRoomUuid = :roomUuid
              AND s.startTime > :now
              AND s.status IN (
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.DRAFT,
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.SCHEDULED,
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING,
                com.thdpv.movietheater.booking.enums.ShowtimeStatus.SOLD_OUT
              )
            ORDER BY s.startTime ASC
            """)
    List<Showtime> findFutureActiveShowtimesByRoom(@Param("roomUuid") UUID roomUuid, @Param("now") OffsetDateTime now);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.cinemaRoomUuid = :roomUuid
              AND s.uuid <> :excludeUuid
              AND s.status NOT IN (
                    com.thdpv.movietheater.booking.enums.ShowtimeStatus.CANCELLED,
                    com.thdpv.movietheater.booking.enums.ShowtimeStatus.FINISHED
              )
              AND s.endTime > :now
              AND s.startTime < :endTimeWithBuffer
              AND s.endTime > :startTimeWithBuffer
            """)
    List<Showtime> findOverlappingShowtimes(
        @Param("roomUuid") UUID roomUuid,
        @Param("excludeUuid") UUID excludeUuid,
        @Param("startTimeWithBuffer") OffsetDateTime startTimeWithBuffer,
        @Param("endTimeWithBuffer") OffsetDateTime endTimeWithBuffer,
        @Param("now") OffsetDateTime now
    );

    @Query("""
            SELECT COUNT(s) FROM Showtime st
            JOIN Seat s ON s.cinemaRoom.uuid = st.cinemaRoomUuid
            WHERE st.uuid = :showtimeUuid
              AND s.uuid IN :seatUuids
              AND s.isActive = true
              AND s.status = com.thdpv.movietheater.cinema.enums.SeatStatus.ACTIVE
            """)
    long countBookableSeats(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query("select count(s) from Showtime st join Seat s on s.cinemaRoom.uuid = st.cinemaRoomUuid where st.uuid = :showtimeUuid and s.uuid in :seatUuids")
    long countSeatsBelongingToShowtime(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.cinemaRoomUuid IN :roomUuids
              AND s.startTime >= :startRange
              AND s.startTime < :endRange
              AND s.status NOT IN (
                    com.thdpv.movietheater.booking.enums.ShowtimeStatus.CANCELLED,
                    com.thdpv.movietheater.booking.enums.ShowtimeStatus.FINISHED
              )
              AND s.endTime > :now
            """)
    List<Showtime> findActiveShowtimesInRooms(
        @Param("roomUuids") Collection<UUID> roomUuids,
        @Param("startRange") OffsetDateTime startRange,
        @Param("endRange") OffsetDateTime endRange,
        @Param("now") OffsetDateTime now
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Showtime s SET s.status = :cancelled
            WHERE s.status = :draft
              AND s.endTime <= :now
            """)
    int cancelExpiredDrafts(
            @Param("now") OffsetDateTime now,
            @Param("draft") ShowtimeStatus draft,
            @Param("cancelled") ShowtimeStatus cancelled);

    @Query("""
            SELECT MIN(s.startTime) FROM Showtime s
            WHERE s.movieUuid = :movieUuid
              AND s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.SCHEDULED
              AND s.startTime > :now
            """)
    OffsetDateTime findEarliestScheduledStart(
            @Param("movieUuid") UUID movieUuid,
            @Param("now") OffsetDateTime now);

    @Query("""
            SELECT s.movieUuid, MIN(s.startTime) FROM Showtime s
            WHERE s.movieUuid IN :movieUuids
              AND s.status = com.thdpv.movietheater.booking.enums.ShowtimeStatus.SCHEDULED
              AND s.startTime > :now
            GROUP BY s.movieUuid
            """)
    List<Object[]> findEarliestScheduledStarts(
            @Param("movieUuids") Collection<UUID> movieUuids,
            @Param("now") OffsetDateTime now);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.status IN :statuses
              AND s.startTime > :now
            ORDER BY s.startTime ASC
            """)
    List<Showtime> findUpcomingPublic(
            @Param("statuses") Collection<ShowtimeStatus> statuses,
            @Param("now") OffsetDateTime now);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.status IN :statuses
              AND s.startTime > :now
              AND s.cinemaRoomUuid IN (
                  SELECT r.uuid FROM CinemaRoom r WHERE r.cinema.uuid = :cinemaUuid)
            ORDER BY s.startTime ASC
            """)
    List<Showtime> findUpcomingByCinema(
            @Param("statuses") Collection<ShowtimeStatus> statuses,
            @Param("now") OffsetDateTime now,
            @Param("cinemaUuid") UUID cinemaUuid);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.status IN :statuses
              AND s.startTime > :now
              AND s.startTime >= :rangeStart
              AND s.startTime < :rangeEnd
            ORDER BY s.startTime ASC
            """)
    List<Showtime> findUpcomingByDateRange(
            @Param("statuses") Collection<ShowtimeStatus> statuses,
            @Param("now") OffsetDateTime now,
            @Param("rangeStart") OffsetDateTime rangeStart,
            @Param("rangeEnd") OffsetDateTime rangeEnd);

    @Query("""
            SELECT s FROM Showtime s
            WHERE s.status IN :statuses
              AND s.startTime > :now
              AND s.cinemaRoomUuid IN (
                  SELECT r.uuid FROM CinemaRoom r WHERE r.cinema.uuid = :cinemaUuid)
              AND s.startTime >= :rangeStart
              AND s.startTime < :rangeEnd
            ORDER BY s.startTime ASC
            """)
    List<Showtime> findUpcomingByCinemaAndDateRange(
            @Param("statuses") Collection<ShowtimeStatus> statuses,
            @Param("now") OffsetDateTime now,
            @Param("cinemaUuid") UUID cinemaUuid,
            @Param("rangeStart") OffsetDateTime rangeStart,
            @Param("rangeEnd") OffsetDateTime rangeEnd);

    @Query("SELECT s FROM Showtime s ORDER BY s.startTime DESC")
    List<Showtime> findAllOrderByStartTimeDesc();

    Page<Showtime> findAllByOrderByStartTimeDesc(Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Showtime s SET s.status = :finished
            WHERE s.endTime <= :now
              AND s.status IN :statuses
            """)
    int markFinishedIfExpired(
            @Param("now") OffsetDateTime now,
            @Param("statuses") Collection<ShowtimeStatus> statuses,
            @Param("finished") ShowtimeStatus finished);

    @Query("SELECT s.uuid FROM Showtime s WHERE s.endTime <= :now")
    List<UUID> findExpiredShowtimeUuids(@Param("now") OffsetDateTime now);

    @Query(value = """
            SELECT st.uuid,
                   st.movie_uuid,
                   st.cinema_room_uuid,
                   st.start_time,
                   COALESCE(NULLIF(cr.capacity, 0), seat_counts.active_seats, 0) AS capacity,
                   COALESCE(booked_counts.booked, 0) AS booked,
                   COALESCE(locked_counts.locked, 0) AS locked
            FROM showtime st
            JOIN cinema_room cr ON cr.uuid = st.cinema_room_uuid
            LEFT JOIN (
                SELECT s.cinema_room_uuid, COUNT(*) AS active_seats
                FROM seat s
                WHERE s.is_active = true
                GROUP BY s.cinema_room_uuid
            ) seat_counts ON seat_counts.cinema_room_uuid = cr.uuid
            LEFT JOIN (
                SELECT bs.showtime_uuid, COUNT(*) AS booked
                FROM booking_seat bs
                GROUP BY bs.showtime_uuid
            ) booked_counts ON booked_counts.showtime_uuid = st.uuid
            LEFT JOIN (
                SELECT sl.showtime_uuid, COUNT(DISTINCT sl.seat_uuid) AS locked
                FROM seat_locked sl
                WHERE sl.expired_at > :now
                GROUP BY sl.showtime_uuid
            ) locked_counts ON locked_counts.showtime_uuid = st.uuid
            WHERE st.status IN ('OPEN_FOR_BOOKING', 'SCHEDULED')
              AND st.start_time > :now
              AND st.start_time < :windowEnd
            ORDER BY st.start_time ASC
            """, nativeQuery = true)
    List<Object[]> findUpcomingAvailabilityRows(
            @Param("now") OffsetDateTime now,
            @Param("windowEnd") OffsetDateTime windowEnd);
}
