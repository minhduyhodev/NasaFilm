package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.ShowtimeSeatMapResponse;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ShowtimeSeatService {

    private static final int LOCK_TTL_SECONDS = 300;

    @PersistenceContext
    private EntityManager entityManager;

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ShowtimeSeatMapResponse getSeatMap(UUID showtimeUuid, List<UUID> selectedSeatUuids, String currentUserEmail) {
        OffsetDateTime now = OffsetDateTime.now();
        UUID currentUserUuid = resolveCurrentUserUuid(currentUserEmail);
        Set<UUID> selectedSet = normalizeSelectedSeatUuids(selectedSeatUuids);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("""
                select
                    st.uuid as showtime_uuid,
                    st.cinema_room_uuid,
                    st.start_time,
                    st.end_time,
                    s.uuid as seat_uuid,
                    s.row_name,
                    s.seat_number,
                    s.status as seat_db_status,
                    stt.uuid as seat_type_uuid,
                    stt.name as seat_type_name,
                    stt.base_price,
                    coalesce(stt.price_modifier, 1),
                    bs.uuid as booking_seat_uuid,
                    sl.user_uuid as locked_user_uuid,
                    sl.expired_at as locked_until
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
                order by s.row_name asc, s.seat_number asc
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("now", now)
                .getResultList();

        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }

        UUID responseShowtimeUuid = toUuid(rows.get(0)[0]);
        UUID cinemaRoomUuid = toUuid(rows.get(0)[1]);
        OffsetDateTime startTime = toOffsetDateTime(rows.get(0)[2]);
        OffsetDateTime endTime = toOffsetDateTime(rows.get(0)[3]);

        Map<String, List<SeatView>> seatRows = new LinkedHashMap<>();
        for (Object[] row : rows) {
            SeatView seatView = mapSeatRow(row, currentUserUuid, selectedSet);
            seatRows.computeIfAbsent(seatView.rowName(), ignored -> new ArrayList<>())
                    .add(seatView);
        }

        applySingleGapBlocking(seatRows);

        List<ShowtimeSeatMapResponse.RowItem> responseRows = new ArrayList<>();
        for (Map.Entry<String, List<SeatView>> entry : seatRows.entrySet()) {
            List<ShowtimeSeatMapResponse.SeatItem> seats = new ArrayList<>();
            for (SeatView seatView : entry.getValue()) {
                seats.add(new ShowtimeSeatMapResponse.SeatItem(
                        seatView.seatUuid(),
                        seatView.seatNumber(),
                        seatView.seatDbStatus(),
                        seatView.seatTypeUuid(),
                        seatView.seatTypeName(),
                        seatView.price(),
                        seatView.availabilityStatus(),
                        seatView.selected(),
                        seatView.blocked(),
                        seatView.lockedUntil()));
            }
            responseRows.add(new ShowtimeSeatMapResponse.RowItem(entry.getKey(), seats));
        }

        return new ShowtimeSeatMapResponse(
                responseShowtimeUuid,
                cinemaRoomUuid,
                startTime,
                endTime,
                LOCK_TTL_SECONDS,
                responseRows);
    }

    private SeatView mapSeatRow(Object[] row, UUID currentUserUuid, Set<UUID> selectedSet) {
        UUID seatUuid = toUuid(row[4]);
        String rowName = stringValue(row[5]);
        Integer seatNumber = toInteger(row[6]);
        String seatDbStatus = stringValue(row[7]);
        UUID seatTypeUuid = toUuid(row[8]);
        String seatTypeName = stringValue(row[9]);
        BigDecimal basePrice = toBigDecimal(row[10]);
        BigDecimal priceModifier = toBigDecimal(row[11]);
        boolean booked = row[12] != null;
        UUID lockedUserUuid = toUuid(row[13]);
        OffsetDateTime lockedUntil = toOffsetDateTime(row[14]);
        boolean selected = selectedSet.contains(seatUuid);

        String availabilityStatus = resolveAvailabilityStatus(seatDbStatus, booked, lockedUserUuid, currentUserUuid);
        BigDecimal price = basePrice.multiply(priceModifier);

        return new SeatView(
                seatUuid,
                rowName,
                seatNumber,
                seatDbStatus,
                seatTypeUuid,
                seatTypeName,
                price,
                availabilityStatus,
                selected,
                false,
                lockedUntil);
    }

    private void applySingleGapBlocking(Map<String, List<SeatView>> seatRows) {
        for (List<SeatView> seats : seatRows.values()) {
            int segmentStart = 0;
            while (segmentStart < seats.size()) {
                int segmentEnd = segmentStart;
                while (segmentEnd + 1 < seats.size()
                        && seats.get(segmentEnd + 1).seatNumber() == seats.get(segmentEnd).seatNumber() + 1) {
                    segmentEnd++;
                }

                for (int i = segmentStart + 1; i < segmentEnd; i++) {
                    SeatView current = seats.get(i);
                    if (!current.isPlainAvailable()) {
                        continue;
                    }

                    boolean leftUnavailable = seats.get(i - 1).isUnavailableForGapRule();
                    boolean rightUnavailable = seats.get(i + 1).isUnavailableForGapRule();
                    if (leftUnavailable && rightUnavailable) {
                        seats.set(i, current.withBlocked(true));
                    }
                }

                segmentStart = segmentEnd + 1;
            }
        }
    }

    private String resolveAvailabilityStatus(String seatDbStatus, boolean booked, UUID lockedUserUuid, UUID currentUserUuid) {
        if (seatDbStatus != null && !"ACTIVE".equalsIgnoreCase(seatDbStatus.trim())) {
            return "UNAVAILABLE";
        }
        if (booked) {
            return "BOOKED";
        }
        if (lockedUserUuid != null && Objects.equals(lockedUserUuid, currentUserUuid)) {
            return "LOCKED_BY_ME";
        }
        if (lockedUserUuid != null) {
            return "LOCKED_BY_OTHER";
        }
        return "AVAILABLE";
    }

    private Set<UUID> normalizeSelectedSeatUuids(Collection<UUID> selectedSeatUuids) {
        if (selectedSeatUuids == null || selectedSeatUuids.isEmpty()) {
            return Set.of();
        }
        return new LinkedHashSet<>(selectedSeatUuids);
    }

    private UUID resolveCurrentUserUuid(String currentUserEmail) {
        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(currentUserEmail)
                .map(user -> user.getId())
                .orElse(null);
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

    private record SeatView(
            UUID seatUuid,
            String rowName,
            Integer seatNumber,
            String seatDbStatus,
            UUID seatTypeUuid,
            String seatTypeName,
            BigDecimal price,
            String availabilityStatus,
            boolean selected,
            boolean blocked,
            OffsetDateTime lockedUntil) {

        private boolean isPlainAvailable() {
            return "AVAILABLE".equals(availabilityStatus) && !selected;
        }

        private boolean isUnavailableForGapRule() {
            return !"AVAILABLE".equals(availabilityStatus) || selected;
        }

        private SeatView withBlocked(boolean nextBlocked) {
            return new SeatView(
                    seatUuid,
                    rowName,
                    seatNumber,
                    seatDbStatus,
                    seatTypeUuid,
                    seatTypeName,
                    price,
                    availabilityStatus,
                    selected,
                    nextBlocked,
                    lockedUntil);
        }
    }
}
