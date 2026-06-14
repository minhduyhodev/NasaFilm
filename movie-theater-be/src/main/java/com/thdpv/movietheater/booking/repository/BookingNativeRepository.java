package com.thdpv.movietheater.booking.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Repository
public class BookingNativeRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public boolean existsShowtime(UUID showtimeUuid) {
        Number count = (Number) entityManager.createNativeQuery("select count(1) from showtime where uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .getSingleResult();
        return count != null && count.longValue() > 0L;
    }

    public boolean hasConfirmedBookings(UUID showtimeUuid) {
        Number count = (Number) entityManager.createNativeQuery("select count(1) from booking where showtime_uuid = :showtimeUuid and status = 'CONFIRMED'")
                .setParameter("showtimeUuid", showtimeUuid)
                .getSingleResult();
        return count != null && count.longValue() > 0L;
    }

    public void cleanupExpiredLocks(UUID showtimeUuid, OffsetDateTime now) {
        entityManager.createNativeQuery("""
                delete from seat_locked
                where showtime_uuid = :showtimeUuid
                  and expired_at <= :now
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("now", now)
                .executeUpdate();
    }

    public List<LockedSeat> lockActiveSeatsForConfirm(UUID showtimeUuid, UUID userUuid, Collection<UUID> seatUuids,
            OffsetDateTime now) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
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
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("userUuid", userUuid)
                .setParameter("seatUuids", seatUuids)
                .setParameter("now", now)
                .getResultList();

        List<LockedSeat> lockedSeats = new ArrayList<>();
        for (Object[] row : rows) {
            BigDecimal price = toBigDecimal(row[3]).multiply(toBigDecimal(row[4]));
            lockedSeats.add(new LockedSeat(toUuid(row[0]), stringValue(row[1]), toInteger(row[2]), price));
        }
        return lockedSeats;
    }

    public long countBookedSeats(UUID showtimeUuid, Collection<UUID> seatUuids) {
        Number count = (Number) entityManager.createNativeQuery("""
                select count(1)
                from booking_seat
                where showtime_uuid = :showtimeUuid
                  and seat_uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("seatUuids", seatUuids)
                .getSingleResult();
        return count != null ? count.longValue() : 0L;
    }

    public List<ComboPrice> loadCombos(Collection<UUID> comboUuids) {
        if (comboUuids.isEmpty()) {
            return List.of();
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                select uuid, name, price, status
                from combo
                where uuid in (:comboUuids)
                """)
                .setParameter("comboUuids", comboUuids)
                .getResultList();

        List<ComboPrice> combos = new ArrayList<>();
        for (Object[] row : rows) {
            combos.add(new ComboPrice(toUuid(row[0]), stringValue(row[1]), toBigDecimal(row[2]), stringValue(row[3])));
        }
        return combos;
    }

    @SuppressWarnings("unchecked")
    public List<ComboPrice> loadActiveCombos() {
        List<Object[]> rows = entityManager.createNativeQuery("""
                select uuid, name, price, status
                from combo
                where status = 'ACTIVE'
                """)
                .getResultList();

        List<ComboPrice> combos = new ArrayList<>();
        for (Object[] row : rows) {
            combos.add(new ComboPrice(toUuid(row[0]), stringValue(row[1]), toBigDecimal(row[2]), stringValue(row[3])));
        }
        return combos;
    }

    public List<SeatGapState> loadSeatGapStates(UUID showtimeUuid, OffsetDateTime now) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                select
                    s.uuid,
                    s.row_name,
                    s.seat_number,
                    s.status,
                    bs.uuid as booking_seat_uuid,
                    sl.user_uuid as locked_user_uuid
                from showtime st
                join seat s on s.cinema_room_uuid = st.cinema_room_uuid
                left join booking_seat bs
                    on bs.showtime_uuid = st.uuid
                   and bs.seat_uuid = s.uuid
                left join seat_locked sl
                    on sl.showtime_uuid = st.uuid
                   and sl.seat_uuid = s.uuid
                   and sl.expired_at > :now
                where st.uuid = :showtimeUuid
                order by s.row_name asc, s.seat_number asc
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("now", now)
                .getResultList();

        List<SeatGapState> states = new ArrayList<>();
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

    public void addUserScore(UUID userUuid, int scoreAdded) {
        entityManager.createNativeQuery("""
                update users
                set score = coalesce(score, 0) + :scoreAdded
                where id = :userUuid
                """)
                .setParameter("scoreAdded", scoreAdded)
                .setParameter("userUuid", userUuid)
                .executeUpdate();
    }

    public void insertScoreHistory(UUID userUuid, int scoreAdded, UUID bookingUuid, OffsetDateTime createdAt) {
        entityManager.createNativeQuery("""
                insert into score_history (uuid, user_uuid, score_amount, type, description, created_at)
                values (:uuid, :userUuid, :scoreAmount, :type, :description, :createdAt)
                """)
                .setParameter("uuid", UUID.randomUUID())
                .setParameter("userUuid", userUuid)
                .setParameter("scoreAmount", scoreAdded)
                .setParameter("type", "EARN")
                .setParameter("description", "Earned from booking " + bookingUuid)
                .setParameter("createdAt", createdAt)
                .executeUpdate();
    }

    public void insertRefundScoreHistory(UUID userUuid, int scoreDeducted, UUID bookingUuid, OffsetDateTime createdAt) {
        entityManager.createNativeQuery("""
                insert into score_history (uuid, user_uuid, score_amount, type, description, created_at)
                values (:uuid, :userUuid, :scoreAmount, :type, :description, :createdAt)
                """)
                .setParameter("uuid", UUID.randomUUID())
                .setParameter("userUuid", userUuid)
                .setParameter("scoreAmount", -scoreDeducted)
                .setParameter("type", "REFUND")
                .setParameter("description", "Refunded from booking " + bookingUuid)
                .setParameter("createdAt", createdAt)
                .executeUpdate();
    }

    public void deleteSeatLocks(UUID showtimeUuid, UUID userUuid, Collection<UUID> seatUuids) {
        entityManager.createNativeQuery("""
                delete from seat_locked
                where showtime_uuid = :showtimeUuid
                  and user_uuid = :userUuid
                  and seat_uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("userUuid", userUuid)
                .setParameter("seatUuids", seatUuids)
                .executeUpdate();
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

    @SuppressWarnings("unchecked")
    public List<Object[]> loadUserBookings(UUID userUuid) {
        return entityManager.createNativeQuery("""
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
                    ), '')
                from booking b
                join showtime st on st.uuid = b.showtime_uuid
                join movie m on m.uuid = st.movie_uuid
                join cinema_room cr on cr.uuid = st.cinema_room_uuid
                where b.user_uuid = :userUuid
                order by b.created_at desc
                """)
                .setParameter("userUuid", userUuid)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> loadAdminBookings(String keyword) {
        return loadAdminBookings(keyword, null, null);
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> loadAdminBookings(String keyword, Integer offset, Integer limit) {
        String queryStr = """
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
                """;
        if (keyword != null && !keyword.isBlank()) {
            queryStr += " where upper(u.full_name) like :keyword or upper(u.email) like :keyword or upper(m.title) like :keyword ";
        }
        queryStr += " order by b.created_at desc ";
        if (limit != null && offset != null) {
            queryStr += " limit :limit offset :offset ";
        }

        var nativeQuery = entityManager.createNativeQuery(queryStr);
        if (keyword != null && !keyword.isBlank()) {
            nativeQuery.setParameter("keyword", "%" + keyword.toUpperCase() + "%");
        }
        if (limit != null && offset != null) {
            nativeQuery.setParameter("limit", limit);
            nativeQuery.setParameter("offset", offset);
        }
        return nativeQuery.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> loadSeatsForBooking(UUID bookingUuid) {
        return entityManager.createNativeQuery("""
                select s.row_name, s.seat_number
                from booking_seat bs
                join seat s on s.uuid = bs.seat_uuid
                where bs.booking_uuid = :bookingUuid
                order by s.row_name asc, s.seat_number asc
                """)
                .setParameter("bookingUuid", bookingUuid)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> loadCombosForBooking(UUID bookingUuid) {
        return entityManager.createNativeQuery("""
                select c.name, bc.quantity
                from booking_combo bc
                join combo c on c.uuid = bc.combo_uuid
                where bc.booking_uuid = :bookingUuid
                """)
                .setParameter("bookingUuid", bookingUuid)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<String> loadTicketCodesForBooking(UUID bookingUuid) {
        return entityManager.createNativeQuery("""
                select ticket_code
                from ticket
                where booking_uuid = :bookingUuid
                """)
                .setParameter("bookingUuid", bookingUuid)
                .getResultList();
    }

    public OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atOffset(ZoneOffset.UTC);
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atOffset(ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(value.toString());
    }

    public OffsetDateTime getShowtimeStartTime(UUID showtimeUuid) {
        @SuppressWarnings("unchecked")
        List<Object> rows = entityManager.createNativeQuery("select start_time from showtime where uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .getResultList();
        if (rows.isEmpty()) {
            return null;
        }
        return toOffsetDateTime(rows.get(0));
    }

    public void slideShowtime(UUID showtimeUuid, OffsetDateTime newStart, long daysToAdd) {
        // 1. Delete tickets associated with showtime's bookings
        entityManager.createNativeQuery("""
                delete from ticket
                where booking_uuid in (select uuid from booking where showtime_uuid = :showtimeUuid)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();

        // 2. Delete booking combos associated with showtime's bookings
        entityManager.createNativeQuery("""
                delete from booking_combo
                where booking_uuid in (select uuid from booking where showtime_uuid = :showtimeUuid)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();

        // 3. Delete bookings associated with showtime
        entityManager.createNativeQuery("delete from booking where showtime_uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();

        // 4. Update showtime start/end times
        entityManager.createNativeQuery("""
                update showtime
                set start_time = :newStart,
                    end_time = end_time + interval '1 day' * :daysToAdd
                where uuid = :showtimeUuid
                """)
                .setParameter("newStart", newStart)
                .setParameter("daysToAdd", daysToAdd)
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();

        // 5. Delete locks
        entityManager.createNativeQuery("delete from seat_locked where showtime_uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();

        // 6. Delete booking seats
        entityManager.createNativeQuery("delete from booking_seat where showtime_uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .executeUpdate();
    }

    public record LockedSeat(UUID seatUuid, String rowName, Integer seatNumber, BigDecimal price) {
    }

    public record ComboPrice(UUID comboUuid, String name, BigDecimal unitPrice, String status) {
    }

    public record SeatGapState(UUID seatUuid, String rowName, Integer seatNumber, String seatStatus,
            boolean booked, boolean locked) {
    }
}
