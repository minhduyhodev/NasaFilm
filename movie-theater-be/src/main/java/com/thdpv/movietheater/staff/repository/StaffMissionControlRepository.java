package com.thdpv.movietheater.staff.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.thdpv.movietheater.booking.entity.Showtime;

@Repository
public interface StaffMissionControlRepository extends JpaRepository<Showtime, UUID> {

    @Query(value = """
            SELECT st.uuid,
                   st.movie_uuid,
                   m.title,
                   COALESCE(
                       (SELECT mm.media_url FROM movie_media mm
                        WHERE mm.movie_uuid = m.uuid AND mm.is_primary = true LIMIT 1),
                       (SELECT mm.media_url FROM movie_media mm
                        WHERE mm.movie_uuid = m.uuid AND mm.media_type = 'POSTER' LIMIT 1),
                       (SELECT mm.media_url FROM movie_media mm
                        WHERE mm.movie_uuid = m.uuid ORDER BY mm.sort_order ASC LIMIT 1)
                   ),
                   COALESCE(c.name, 'NASA Cinema'),
                   COALESCE(cr.name, ''),
                   st.start_time,
                   COALESCE(NULLIF(cr.capacity, 0), seat_counts.active_seats, 0),
                   COALESCE(booked_counts.booked, 0),
                   COALESCE(locked_counts.locked, 0)
            FROM showtime st
            JOIN movie m ON m.uuid = st.movie_uuid
            JOIN cinema_room cr ON cr.uuid = st.cinema_room_uuid
            LEFT JOIN cinema c ON c.uuid = cr.cinema_uuid
            LEFT JOIN (
                SELECT s.cinema_room_uuid, COUNT(*) AS active_seats
                FROM seat s
                WHERE s.is_active = true
                GROUP BY s.cinema_room_uuid
            ) seat_counts ON seat_counts.cinema_room_uuid = cr.uuid
            LEFT JOIN (
                SELECT bs.showtime_uuid, COUNT(*) AS booked
                FROM booking_seat bs
                JOIN booking b ON b.uuid = bs.booking_uuid
                WHERE b.status = 'CONFIRMED'
                GROUP BY bs.showtime_uuid
            ) booked_counts ON booked_counts.showtime_uuid = st.uuid
            LEFT JOIN (
                SELECT sl.showtime_uuid, COUNT(DISTINCT sl.seat_uuid) AS locked
                FROM seat_locked sl
                WHERE sl.expired_at > :now
                GROUP BY sl.showtime_uuid
            ) locked_counts ON locked_counts.showtime_uuid = st.uuid
            WHERE st.status IN ('OPEN_FOR_BOOKING', 'SOLD_OUT')
              AND st.start_time > :now
              AND st.start_time < :rangeEnd
            ORDER BY st.start_time ASC
            """, nativeQuery = true)
    List<Object[]> findOperationalShowtimes(
            @Param("now") OffsetDateTime now,
            @Param("rangeEnd") OffsetDateTime rangeEnd);

    @Query(value = """
            SELECT COALESCE(NULLIF(cr.capacity, 0), seat_counts.active_seats, 0),
                   COALESCE(booked_counts.booked, 0),
                   COALESCE(locked_counts.locked, 0),
                   m.title,
                   COALESCE(c.name, 'NASA Cinema'),
                   COALESCE(cr.name, ''),
                   st.start_time
            FROM showtime st
            JOIN movie m ON m.uuid = st.movie_uuid
            JOIN cinema_room cr ON cr.uuid = st.cinema_room_uuid
            LEFT JOIN cinema c ON c.uuid = cr.cinema_uuid
            LEFT JOIN (
                SELECT s.cinema_room_uuid, COUNT(*) AS active_seats
                FROM seat s
                WHERE s.is_active = true
                GROUP BY s.cinema_room_uuid
            ) seat_counts ON seat_counts.cinema_room_uuid = cr.uuid
            LEFT JOIN (
                SELECT bs.showtime_uuid, COUNT(*) AS booked
                FROM booking_seat bs
                JOIN booking b ON b.uuid = bs.booking_uuid
                WHERE b.status = 'CONFIRMED'
                GROUP BY bs.showtime_uuid
            ) booked_counts ON booked_counts.showtime_uuid = st.uuid
            LEFT JOIN (
                SELECT sl.showtime_uuid, COUNT(DISTINCT sl.seat_uuid) AS locked
                FROM seat_locked sl
                WHERE sl.expired_at > :now
                GROUP BY sl.showtime_uuid
            ) locked_counts ON locked_counts.showtime_uuid = st.uuid
            WHERE st.uuid = :showtimeUuid
            """, nativeQuery = true)
    List<Object[]> findShowtimeOccupancy(
            @Param("showtimeUuid") UUID showtimeUuid,
            @Param("now") OffsetDateTime now);

    @Query(value = """
            SELECT COUNT(*)
            FROM ticket t
            JOIN booking b ON b.uuid = t.booking_uuid
            WHERE b.showtime_uuid = :showtimeUuid
              AND t.status = 'USED'
            """, nativeQuery = true)
    long countCheckedInTickets(@Param("showtimeUuid") UUID showtimeUuid);

    @Query(value = """
            SELECT COALESCE(s.row_name || CAST(s.seat_number AS TEXT), '')
            FROM booking_seat bs
            JOIN seat s ON s.uuid = bs.seat_uuid
            WHERE bs.booking_uuid = :bookingUuid
            ORDER BY s.row_name, s.seat_number
            """, nativeQuery = true)
    List<String> findSeatLabelsByBooking(@Param("bookingUuid") UUID bookingUuid);

    @Query(value = """
            SELECT COUNT(*)
            FROM seat s
            JOIN seat_type st ON st.uuid = s.seat_type_uuid
            JOIN showtime sh ON sh.cinema_room_uuid = s.cinema_room_uuid
            WHERE sh.uuid = :showtimeUuid
              AND s.is_active = true
              AND UPPER(st.name) LIKE '%VIP%'
            """, nativeQuery = true)
    long countVipSeatsTotal(@Param("showtimeUuid") UUID showtimeUuid);

    @Query(value = """
            SELECT COUNT(*)
            FROM seat s
            JOIN seat_type st ON st.uuid = s.seat_type_uuid
            JOIN showtime sh ON sh.cinema_room_uuid = s.cinema_room_uuid
            WHERE sh.uuid = :showtimeUuid
              AND s.is_active = true
              AND UPPER(st.name) LIKE '%VIP%'
              AND s.uuid NOT IN (
                  SELECT bs.seat_uuid
                  FROM booking_seat bs
                  JOIN booking b ON b.uuid = bs.booking_uuid
                  WHERE bs.showtime_uuid = :showtimeUuid
                    AND b.status = 'CONFIRMED'
              )
              AND s.uuid NOT IN (
                  SELECT sl.seat_uuid
                  FROM seat_locked sl
                  WHERE sl.showtime_uuid = :showtimeUuid
                    AND sl.expired_at > :now
              )
            """, nativeQuery = true)
    long countVipSeatsAvailable(
            @Param("showtimeUuid") UUID showtimeUuid,
            @Param("now") OffsetDateTime now);

    @Query(value = """
            SELECT c.name, SUM(bc.quantity)
            FROM booking_combo bc
            JOIN combo c ON c.uuid = bc.combo_uuid
            JOIN booking b ON b.uuid = bc.booking_uuid
            WHERE b.showtime_uuid = :showtimeUuid
              AND b.status = 'CONFIRMED'
            GROUP BY c.name
            ORDER BY SUM(bc.quantity) DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> findTopCombosByShowtime(@Param("showtimeUuid") UUID showtimeUuid);

    @Query(value = """
            SELECT t.ticket_code,
                   t.status,
                   t.checked_in_at,
                   b.uuid,
                   b.showtime_uuid,
                   u.full_name,
                   m.title,
                   COALESCE(c.name, 'NASA Cinema'),
                   COALESCE(cr.name, ''),
                   st.start_time,
                   COALESCE(s.row_name || CAST(s.seat_number AS TEXT), ''),
                   COALESCE(b.booking_type, 'THEATER'),
                   b.status
            FROM ticket t
            JOIN booking b ON b.uuid = t.booking_uuid
            JOIN users u ON u.id = b.user_uuid
            JOIN booking_seat bs ON bs.uuid = t.booking_seat_uuid
            JOIN seat s ON s.uuid = bs.seat_uuid
            LEFT JOIN showtime st ON st.uuid = b.showtime_uuid
            LEFT JOIN movie m ON m.uuid = COALESCE(b.movie_uuid, st.movie_uuid)
            LEFT JOIN cinema_room cr ON cr.uuid = st.cinema_room_uuid
            LEFT JOIN cinema c ON c.uuid = cr.cinema_uuid
            WHERE t.ticket_code = :ticketCode
            LIMIT 1
            """, nativeQuery = true)
    List<Object[]> findTicketCheckInContext(@Param("ticketCode") String ticketCode);
}
