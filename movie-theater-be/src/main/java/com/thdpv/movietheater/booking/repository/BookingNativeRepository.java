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

    @SuppressWarnings("unused")
    private OffsetDateTime toOffsetDateTime(Object value) {
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

    public record LockedSeat(UUID seatUuid, String rowName, Integer seatNumber, BigDecimal price) {
    }

    public record ComboPrice(UUID comboUuid, String name, BigDecimal unitPrice, String status) {
    }

    public record SeatGapState(UUID seatUuid, String rowName, Integer seatNumber, String seatStatus,
            boolean booked, boolean locked) {
    }
}
