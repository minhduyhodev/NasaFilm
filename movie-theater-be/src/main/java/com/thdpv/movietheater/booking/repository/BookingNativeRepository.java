package com.thdpv.movietheater.booking.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Booking;

@Repository
public interface BookingNativeRepository extends JpaRepository<Booking, UUID> {

    @Query("select count(st) from Showtime st where st.uuid = :showtimeUuid")
    long countShowtimeByUuid(@Param("showtimeUuid") UUID showtimeUuid);

    default boolean existsShowtime(UUID showtimeUuid) {
        return countShowtimeByUuid(showtimeUuid) > 0;
    }

    @Query("select count(b) from Booking b where b.showtimeUuid = :showtimeUuid and b.status = 'CONFIRMED'")
    long countConfirmedBookings(@Param("showtimeUuid") UUID showtimeUuid);

    default boolean hasConfirmedBookings(UUID showtimeUuid) {
        return countConfirmedBookings(showtimeUuid) > 0;
    }

    @Modifying
    @Query("delete from SeatLocked sl where sl.showtimeUuid = :showtimeUuid and sl.expiredAt <= :now")
    void cleanupExpiredLocks(@Param("showtimeUuid") UUID showtimeUuid, @Param("now") OffsetDateTime now);

    @Query(value = """
            select
                sl.seat_uuid,
                s.row_name,
                s.seat_number,
                stt.base_price,
                coalesce(stt.price_modifier, 1)
            from seat_locked sl
            join showtime st on st.uuid = sl.showtime_uuid
            join seat s on s.uuid = sl.seat_uuid and s.cinema_room_uuid = st.cinema_room_uuid
            join seat_type stt on stt.uuid = s.seat_type_uuid
            where sl.showtime_uuid = :showtimeUuid
              and sl.user_uuid = :userUuid
              and sl.seat_uuid in (:seatUuids)
              and sl.expired_at > :now
            for update
            """, nativeQuery = true)
    List<Object[]> queryActiveSeatsForConfirm(
            @Param("showtimeUuid") UUID showtimeUuid,
            @Param("userUuid") UUID userUuid,
            @Param("seatUuids") Collection<UUID> seatUuids,
            @Param("now") OffsetDateTime now);

    default List<LockedSeat> lockActiveSeatsForConfirm(UUID showtimeUuid, UUID userUuid, Collection<UUID> seatUuids, OffsetDateTime now) {
        List<Object[]> rows = queryActiveSeatsForConfirm(showtimeUuid, userUuid, seatUuids, now);
        List<LockedSeat> lockedSeats = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            BigDecimal price = toBigDecimal(row[3]).multiply(toBigDecimal(row[4]));
            lockedSeats.add(new LockedSeat(toUuid(row[0]), stringValue(row[1]), toInteger(row[2]), price));
        }
        return lockedSeats;
    }

    @Query(value = """
            select count(1)
            from booking_seat
            where showtime_uuid = :showtimeUuid
              and seat_uuid in (:seatUuids)
            """, nativeQuery = true)
    long countBookedSeats(@Param("showtimeUuid") UUID showtimeUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query(value = """
            select uuid, name, price, status
            from combo
            where uuid in (:comboUuids)
            """, nativeQuery = true)
    List<Object[]> queryCombos(@Param("comboUuids") Collection<UUID> comboUuids);

    default List<ComboPrice> loadCombos(Collection<UUID> comboUuids) {
        if (comboUuids == null || comboUuids.isEmpty()) {
            return List.of();
        }
        List<Object[]> rows = queryCombos(comboUuids);
        List<ComboPrice> combos = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            combos.add(new ComboPrice(toUuid(row[0]), stringValue(row[1]), toBigDecimal(row[2]), stringValue(row[3])));
        }
        return combos;
    }

    @Query(value = """
            select uuid, name, price, status
            from combo
            where status = 'ACTIVE'
            """, nativeQuery = true)
    List<Object[]> queryActiveCombos();

    default List<ComboPrice> loadActiveCombos() {
        List<Object[]> rows = queryActiveCombos();
        List<ComboPrice> combos = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            combos.add(new ComboPrice(toUuid(row[0]), stringValue(row[1]), toBigDecimal(row[2]), stringValue(row[3])));
        }
        return combos;
    }

    @Query(value = """
            select
                s.uuid,
                s.row_name,
                s.seat_number,
                s.status,
                bs.uuid as booking_seat_uuid,
                sl.user_uuid as locked_user_uuid
            from showtime st
            join seat s on s.cinema_room_uuid = st.cinema_room_uuid
            join seat_type stt on stt.uuid = s.seat_type_uuid
            left join booking_seat bs
                on bs.showtime_uuid = st.uuid
               and bs.seat_uuid = s.uuid
            left join seat_locked sl
                on sl.showtime_uuid = st.uuid
               and sl.seat_uuid = s.uuid
               and sl.expired_at > :now
            where st.uuid = :showtimeUuid
              and stt.name <> 'COUPLE'
            order by s.row_name asc, s.seat_number asc
            """, nativeQuery = true)
    List<Object[]> querySeatGapStates(@Param("showtimeUuid") UUID showtimeUuid, @Param("now") OffsetDateTime now);

    default List<SeatGapState> loadSeatGapStates(UUID showtimeUuid, OffsetDateTime now) {
        List<Object[]> rows = querySeatGapStates(showtimeUuid, now);
        List<SeatGapState> states = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            states.add(new SeatGapState(
                    toUuid(row[0]),
                    stringValue(row[1]),
                    toInteger(row[2]),
                    stringValue(row[3]),
                    row[4] != null,
                    row[5] != null));
        }
        return states;
    }

    @Modifying
    @Query(value = """
            update users
            set score = coalesce(score, 0) + :scoreAdded
            where id = :userUuid
            """, nativeQuery = true)
    void addUserScore(@Param("userUuid") UUID userUuid, @Param("scoreAdded") int scoreAdded);

    @Modifying
    @Query(value = """
            insert into score_history (uuid, user_uuid, score_amount, type, description, created_at)
            values (:uuid, :userUuid, :scoreAmount, :type, :description, :createdAt)
            """, nativeQuery = true)
    void queryInsertScoreHistory(
            @Param("uuid") UUID uuid,
            @Param("userUuid") UUID userUuid,
            @Param("scoreAmount") int scoreAmount,
            @Param("type") String type,
            @Param("description") String description,
            @Param("createdAt") OffsetDateTime createdAt);

    default void insertScoreHistory(UUID userUuid, int scoreAdded, UUID bookingUuid, OffsetDateTime createdAt) {
        queryInsertScoreHistory(UUID.randomUUID(), userUuid, scoreAdded, "EARN", "Earned from booking " + bookingUuid, createdAt);
    }

    default void insertRefundScoreHistory(UUID userUuid, int scoreDeducted, UUID bookingUuid, OffsetDateTime createdAt) {
        queryInsertScoreHistory(UUID.randomUUID(), userUuid, -scoreDeducted, "REFUND", "Refunded from booking " + bookingUuid, createdAt);
    }

    @Modifying
    @Query(value = """
            delete from seat_locked
            where showtime_uuid = :showtimeUuid
              and user_uuid = :userUuid
              and seat_uuid in (:seatUuids)
            """, nativeQuery = true)
    void deleteSeatLocks(@Param("showtimeUuid") UUID showtimeUuid, @Param("userUuid") UUID userUuid, @Param("seatUuids") Collection<UUID> seatUuids);

    @Query(value = """
            select
                b.uuid,
                b.total_price,
                b.status,
                b.created_at,
                st.start_time,
                m.title,
                cr.name,
                coalesce((
                    select string_agg(s.row_name || s.seat_number, ', ' order by s.row_name asc, s.seat_number asc)
                    from booking_seat bs
                    join seat s on s.uuid = bs.seat_uuid
                    where bs.booking_uuid = b.uuid
                ), ''),
                coalesce((
                    select string_agg(bc.quantity || 'x ' || c.name, ', ' order by c.name asc)
                    from booking_combo bc
                    join combo c on c.uuid = bc.combo_uuid
                    where bc.booking_uuid = b.uuid
                ), ''),
                coalesce((
                    select t.ticket_code
                    from ticket t
                    where t.booking_uuid = b.uuid
                    order by t.issued_at asc
                    limit 1
                ), ''),
                coalesce((
                    select t.status
                    from ticket t
                    where t.booking_uuid = b.uuid
                    order by t.issued_at asc
                    limit 1
                ), '')
            from booking b
            join showtime st on st.uuid = b.showtime_uuid
            join movie m on m.uuid = st.movie_uuid
            join cinema_room cr on cr.uuid = st.cinema_room_uuid
            where b.user_uuid = :userUuid
            order by b.created_at desc
            """, nativeQuery = true)
    List<Object[]> loadUserBookings(@Param("userUuid") UUID userUuid);

    @Query(value = """
            select
                b.uuid,
                u.full_name,
                u.email,
                m.title,
                cr.name,
                b.total_price,
                b.status,
                b.created_at,
                u.avatar_url,
                coalesce((
                    select string_agg(s.row_name || s.seat_number, ', ' order by s.row_name asc, s.seat_number asc)
                    from booking_seat bs
                    join seat s on s.uuid = bs.seat_uuid
                    where bs.booking_uuid = b.uuid
                ), ''),
                coalesce((
                    select string_agg(bc.quantity || 'x ' || c.name, ', ' order by c.name asc)
                    from booking_combo bc
                    join combo c on c.uuid = bc.combo_uuid
                    where bc.booking_uuid = b.uuid
                ), '')
            from booking b
            join users u on u.id = b.user_uuid
            join showtime st on st.uuid = b.showtime_uuid
            join movie m on m.uuid = st.movie_uuid
            join cinema_room cr on cr.uuid = st.cinema_room_uuid
            where (:keyword is null or :keyword = '' or upper(u.full_name) like :keyword or upper(u.email) like :keyword or upper(m.title) like :keyword)
            order by b.created_at desc
            limit :limit offset :offset
            """, nativeQuery = true)
    List<Object[]> queryAdminBookingsWithPagination(
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("limit") int limit);

    @Query(value = """
            select
                b.uuid,
                u.full_name,
                u.email,
                m.title,
                cr.name,
                b.total_price,
                b.status,
                b.created_at,
                u.avatar_url,
                coalesce((
                    select string_agg(s.row_name || s.seat_number, ', ' order by s.row_name asc, s.seat_number asc)
                    from booking_seat bs
                    join seat s on s.uuid = bs.seat_uuid
                    where bs.booking_uuid = b.uuid
                ), ''),
                coalesce((
                    select string_agg(bc.quantity || 'x ' || c.name, ', ' order by c.name asc)
                    from booking_combo bc
                    join combo c on c.uuid = bc.combo_uuid
                    where bc.booking_uuid = b.uuid
                ), '')
            from booking b
            join users u on u.id = b.user_uuid
            join showtime st on st.uuid = b.showtime_uuid
            join movie m on m.uuid = st.movie_uuid
            join cinema_room cr on cr.uuid = st.cinema_room_uuid
            where (:keyword is null or :keyword = '' or upper(u.full_name) like :keyword or upper(u.email) like :keyword or upper(m.title) like :keyword)
            order by b.created_at desc
            """, nativeQuery = true)
    List<Object[]> queryAdminBookingsWithoutPagination(
            @Param("keyword") String keyword);

    default List<Object[]> loadAdminBookings(String keyword) {
        String searchKeyword = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.toUpperCase() + "%";
        return queryAdminBookingsWithoutPagination(searchKeyword);
    }

    default List<Object[]> loadAdminBookings(String keyword, Integer offset, Integer limit) {
        if (limit == null || offset == null) {
            return loadAdminBookings(keyword);
        }
        String searchKeyword = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.toUpperCase() + "%";
        return queryAdminBookingsWithPagination(searchKeyword, offset, limit);
    }

    @Query(value = """
            select s.row_name, s.seat_number
            from booking_seat bs
            join seat s on s.uuid = bs.seat_uuid
            where bs.booking_uuid = :bookingUuid
            order by s.row_name asc, s.seat_number asc
            """, nativeQuery = true)
    List<Object[]> loadSeatsForBooking(@Param("bookingUuid") UUID bookingUuid);

    @Query(value = """
            select c.name, bc.quantity
            from booking_combo bc
            join combo c on c.uuid = bc.combo_uuid
            where bc.booking_uuid = :bookingUuid
            """, nativeQuery = true)
    List<Object[]> loadCombosForBooking(@Param("bookingUuid") UUID bookingUuid);

    @Query(value = """
            select ticket_code
            from ticket
            where booking_uuid = :bookingUuid
            """, nativeQuery = true)
    List<String> loadTicketCodesForBooking(@Param("bookingUuid") UUID bookingUuid);

    @Query("select st.startTime from Showtime st where st.uuid = :showtimeUuid")
    OffsetDateTime queryShowtimeStartTime(@Param("showtimeUuid") UUID showtimeUuid);

    default OffsetDateTime getShowtimeStartTime(UUID showtimeUuid) {
        return queryShowtimeStartTime(showtimeUuid);
    }

    @Modifying
    @Query("delete from Ticket t where t.bookingUuid in (select b.uuid from Booking b where b.showtimeUuid = :showtimeUuid)")
    void deleteTicketsByShowtimeUuid(@Param("showtimeUuid") UUID showtimeUuid);

    @Modifying
    @Query("delete from BookingCombo bc where bc.bookingUuid in (select b.uuid from Booking b where b.showtimeUuid = :showtimeUuid)")
    void deleteBookingCombosByShowtimeUuid(@Param("showtimeUuid") UUID showtimeUuid);

    @Modifying
    @Query("delete from BookingSeat bs where bs.showtimeUuid = :showtimeUuid")
    void deleteBookingSeatsByShowtimeUuid(@Param("showtimeUuid") UUID showtimeUuid);

    @Modifying
    @Query("delete from Booking b where b.showtimeUuid = :showtimeUuid")
    void deleteBookingsByShowtimeUuid(@Param("showtimeUuid") UUID showtimeUuid);

    @Modifying
    @Query("delete from SeatLocked sl where sl.showtimeUuid = :showtimeUuid")
    void deleteSeatLocksByShowtimeUuid(@Param("showtimeUuid") UUID showtimeUuid);

    @Modifying
    @Query(value = """
            update showtime
            set start_time = :newStart,
                end_time = end_time + interval '1 day' * :daysToAdd
            where uuid = cast(:showtimeUuid as uuid)
            """, nativeQuery = true)
    void updateShowtimeTimes(@Param("showtimeUuid") UUID showtimeUuid, @Param("newStart") OffsetDateTime newStart, @Param("daysToAdd") long daysToAdd);

    @Transactional
    default void slideShowtime(UUID showtimeUuid, OffsetDateTime newStart, long daysToAdd) {
        // 1. Delete tickets associated with showtime's bookings
        deleteTicketsByShowtimeUuid(showtimeUuid);

        // 2. Delete booking combos associated with showtime's bookings
        deleteBookingCombosByShowtimeUuid(showtimeUuid);

        // 3. Delete bookings associated with showtime
        deleteBookingsByShowtimeUuid(showtimeUuid);

        // 4. Update showtime start/end times
        updateShowtimeTimes(showtimeUuid, newStart, daysToAdd);

        deleteTicketsByShowtimeUuid(showtimeUuid);
        deleteBookingCombosByShowtimeUuid(showtimeUuid);

        // 5. Delete locks
        deleteSeatLocksByShowtimeUuid(showtimeUuid);

        // 6. Delete booking seats
        deleteBookingSeatsByShowtimeUuid(showtimeUuid);

        deleteBookingsByShowtimeUuid(showtimeUuid);
        deleteSeatLocksByShowtimeUuid(showtimeUuid);
    }

    @Query("select count(m) from Movie m where m.uuid = :movieUuid")
    long countMovieByUuid(@Param("movieUuid") UUID movieUuid);

    @Modifying
    @Query(value = """
            insert into showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time)
            values (cast(:uuid as uuid), cast(:movieUuid as uuid), cast(:roomUuid as uuid), :startTime, :endTime)
            """, nativeQuery = true)
    void insertShowtime(
            @Param("uuid") UUID uuid,
            @Param("movieUuid") UUID movieUuid,
            @Param("roomUuid") UUID roomUuid,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);

    @Transactional
    default void ensureShowtimeExists(UUID showtimeUuid) {
        if (existsShowtime(showtimeUuid)) {
            return;
        }

        if (countMovieByUuid(showtimeUuid) > 0) {
            OffsetDateTime now = OffsetDateTime.now();
            OffsetDateTime startTime = now.withHour(19).withMinute(30).withSecond(0).withNano(0);
            OffsetDateTime endTime = now.withHour(21).withMinute(30).withSecond(0).withNano(0);
            UUID roomUuid = UUID.fromString("88888888-8888-8888-8888-888888888888"); // Phòng chiếu IMAX

            insertShowtime(showtimeUuid, showtimeUuid, roomUuid, startTime, endTime);
        }
    }

    default OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof java.time.Instant instant) {
            return instant.atOffset(java.time.ZoneOffset.UTC);
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant().atOffset(java.time.ZoneOffset.UTC);
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atOffset(java.time.ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(value.toString());
    }

    private UUID toUuid(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(value.toString());
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer number) {
            return number;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    record LockedSeat(UUID seatUuid, String rowName, Integer seatNumber, BigDecimal price) {
    }

    record ComboPrice(UUID comboUuid, String name, BigDecimal unitPrice, String status) {
    }

    record SeatGapState(UUID seatUuid, String rowName, Integer seatNumber, String seatStatus,
            boolean booked, boolean locked) {
    }
}
