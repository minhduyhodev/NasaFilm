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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest;
import com.thdpv.movietheater.booking.dto.response.SeatLockSyncResponse;
import com.thdpv.movietheater.booking.dto.response.ShowtimeSeatMapResponse;
import com.thdpv.movietheater.booking.dto.response.SeatViewDto;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
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

    @Value("${app.showtime.auto-slide-enabled:false}")
    private boolean autoSlideEnabled;

    @PersistenceContext
    private EntityManager entityManager;

    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingNativeRepository bookingRepository;

    @Transactional
    public ShowtimeSeatMapResponse getSeatMap(UUID showtimeUuid, List<UUID> selectedSeatUuids, String currentUserEmail) {
        bookingRepository.ensureShowtimeExists(showtimeUuid);
        OffsetDateTime now = OffsetDateTime.now();
        if (autoSlideEnabled) {
            autoSlideShowtimeIfPast(showtimeUuid, now);
        }
        UUID currentUserUuid = resolveCurrentUserUuid(currentUserEmail);
        Set<UUID> selectedSet = normalizeSelectedSeatUuids(selectedSeatUuids);

        List<SeatViewDto> rows = showtimeRepository.getShowtimeSeatViews(showtimeUuid, now);

        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }

        UUID responseShowtimeUuid = rows.get(0).getShowtimeUuid();
        UUID cinemaRoomUuid = rows.get(0).getCinemaRoomUuid();
        OffsetDateTime startTime = rows.get(0).getStartTime();
        OffsetDateTime endTime = rows.get(0).getEndTime();

        Map<String, List<SeatView>> seatRows = new LinkedHashMap<>();
        for (SeatViewDto row : rows) {
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
                now,
                responseRows);
    }

    @Transactional
    public SeatLockSyncResponse syncSeatLocks(String currentUserEmail, SyncSeatLockRequest request) {
        bookingRepository.ensureShowtimeExists(request.getShowtimeUuid());
        UUID currentUserUuid = resolveRequiredCurrentUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        if (autoSlideEnabled) {
            autoSlideShowtimeIfPast(request.getShowtimeUuid(), now);
        }
        OffsetDateTime expiresAt = now.plusSeconds(LOCK_TTL_SECONDS);
        List<UUID> requestedSeatUuids = normalizeRequestedSeatUuids(request.getSeatUuids());

        assertShowtimeValidForBooking(request.getShowtimeUuid(), now);
        cleanupExpiredLocks(request.getShowtimeUuid(), now);
        validateRequestedSeatsBelongToShowtime(request.getShowtimeUuid(), requestedSeatUuids);
        validateSeatsNotBooked(request.getShowtimeUuid(), requestedSeatUuids);
        validateSeatsNotLockedByOther(request.getShowtimeUuid(), requestedSeatUuids, currentUserUuid, now);

        Set<UUID> currentLockedSeatUuids = findCurrentLockedSeatUuids(request.getShowtimeUuid(), currentUserUuid, now);
        Set<UUID> requestedSeatUuidSet = new LinkedHashSet<>(requestedSeatUuids);

        List<UUID> seatUuidsToRelease = currentLockedSeatUuids.stream()
                .filter(seatUuid -> !requestedSeatUuidSet.contains(seatUuid))
                .toList();
        List<UUID> seatUuidsToKeep = currentLockedSeatUuids.stream()
                .filter(requestedSeatUuidSet::contains)
                .toList();
        List<UUID> seatUuidsToInsert = requestedSeatUuids.stream()
                .filter(seatUuid -> !currentLockedSeatUuids.contains(seatUuid))
                .toList();

        releaseSeatLocks(request.getShowtimeUuid(), currentUserUuid, seatUuidsToRelease);
        refreshSeatLocks(request.getShowtimeUuid(), currentUserUuid, seatUuidsToKeep, now, expiresAt);
        insertSeatLocks(request.getShowtimeUuid(), currentUserUuid, seatUuidsToInsert, now, expiresAt);

        return new SeatLockSyncResponse(
                request.getShowtimeUuid(),
                LOCK_TTL_SECONDS,
                requestedSeatUuids.isEmpty() ? null : expiresAt,
                now,
                requestedSeatUuids);
    }

    private SeatView mapSeatRow(SeatViewDto row, UUID currentUserUuid, Set<UUID> selectedSet) {
        UUID seatUuid = row.getSeatUuid();
        String rowName = row.getRowName();
        Integer seatNumber = row.getSeatNumber();
        String seatDbStatus = row.getSeatDbStatus() != null ? row.getSeatDbStatus().name() : null;
        UUID seatTypeUuid = row.getSeatTypeUuid();
        String seatTypeName = row.getSeatTypeName();
        BigDecimal basePrice = row.getBasePrice();
        BigDecimal priceModifier = row.getPriceModifier();
        boolean booked = row.getBookingSeatUuid() != null;
        UUID lockedUserUuid = row.getLockedUserUuid();
        OffsetDateTime lockedUntil = row.getLockedUntil();
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

                for (int i = segmentStart; i <= segmentEnd; i++) {
                    SeatView current = seats.get(i);
                    if (!current.isPlainAvailable() || "COUPLE".equalsIgnoreCase(current.seatTypeName())) {
                        continue;
                    }

                    boolean leftUnavailable = (i == segmentStart) || seats.get(i - 1).isUnavailableForGapRule();
                    boolean rightUnavailable = (i == segmentEnd) || seats.get(i + 1).isUnavailableForGapRule();

                    if (leftUnavailable && rightUnavailable) {
                        boolean leftSelectedByMe = (i != segmentStart) && (seats.get(i - 1).selected() || "LOCKED_BY_ME".equals(seats.get(i - 1).availabilityStatus()));
                        boolean rightSelectedByMe = (i != segmentEnd) && (seats.get(i + 1).selected() || "LOCKED_BY_ME".equals(seats.get(i + 1).availabilityStatus()));
                        if (leftSelectedByMe || rightSelectedByMe) {
                            seats.set(i, current.withBlocked(true));
                        }
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

    private void assertShowtimeValidForBooking(UUID showtimeUuid, OffsetDateTime now) {
        @SuppressWarnings("unchecked")
        List<Object> rows = entityManager.createNativeQuery("select start_time from showtime where uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .getResultList();
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }
        OffsetDateTime startTime = toOffsetDateTime(rows.get(0));
        if (startTime.isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da bat dau hoac da dien ra, khong the thuc hien");
        }
    }

    private void autoSlideShowtimeIfPast(UUID showtimeUuid, OffsetDateTime now) {
        if (bookingRepository.hasConfirmedBookings(showtimeUuid)) {
            return;
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery("select start_time, end_time from showtime where uuid = :showtimeUuid")
                .setParameter("showtimeUuid", showtimeUuid)
                .getResultList();
        if (rows.isEmpty()) {
            return;
        }
        OffsetDateTime startTime = toOffsetDateTime(rows.get(0)[0]);
        OffsetDateTime endTime = toOffsetDateTime(rows.get(0)[1]);
        if (startTime.isBefore(now)) {
            long daysToAdd = 0;
            OffsetDateTime temp = startTime;
            while (temp.isBefore(now)) {
                temp = temp.plusDays(1);
                daysToAdd++;
            }
            OffsetDateTime newStart = startTime.plusDays(daysToAdd);
            bookingRepository.slideShowtime(showtimeUuid, newStart, daysToAdd);
        }
    }

    private void cleanupExpiredLocks(UUID showtimeUuid, OffsetDateTime now) {
        entityManager.createNativeQuery("""
                delete from seat_locked
                where showtime_uuid = :showtimeUuid
                  and expired_at <= :now
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("now", now)
                .executeUpdate();
    }

    @Transactional
    @Scheduled(fixedDelay = 30000)
    public void cleanupExpiredLocksScheduled() {
        OffsetDateTime now = OffsetDateTime.now();
        entityManager.createNativeQuery("""
                delete from seat_locked
                where expired_at <= :now
                """)
                .setParameter("now", now)
                .executeUpdate();
    }

    private void validateRequestedSeatsBelongToShowtime(UUID showtimeUuid, List<UUID> requestedSeatUuids) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        Number count = (Number) entityManager.createNativeQuery("""
                select count(1)
                from showtime st
                join seat s on s.cinema_room_uuid = st.cinema_room_uuid
                where st.uuid = :showtimeUuid
                  and s.uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("seatUuids", requestedSeatUuids)
                .getSingleResult();
        if (count == null || count.longValue() != requestedSeatUuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Co ghe khong thuoc suat chieu nay");
        }
    }

    private void validateSeatsNotBooked(UUID showtimeUuid, List<UUID> requestedSeatUuids) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        Number count = (Number) entityManager.createNativeQuery("""
                select count(1)
                from booking_seat
                where showtime_uuid = :showtimeUuid
                  and seat_uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("seatUuids", requestedSeatUuids)
                .getSingleResult();
        if (count != null && count.longValue() > 0L) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe da duoc dat");
        }
    }

    private void validateSeatsNotLockedByOther(UUID showtimeUuid, List<UUID> requestedSeatUuids, UUID currentUserUuid,
            OffsetDateTime now) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        Number count = (Number) entityManager.createNativeQuery("""
                select count(1)
                from seat_locked
                where showtime_uuid = :showtimeUuid
                  and seat_uuid in (:seatUuids)
                  and user_uuid <> :userUuid
                  and expired_at > :now
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("seatUuids", requestedSeatUuids)
                .setParameter("userUuid", currentUserUuid)
                .setParameter("now", now)
                .getSingleResult();
        if (count != null && count.longValue() > 0L) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe dang duoc nguoi khac giu");
        }
    }

    private Set<UUID> findCurrentLockedSeatUuids(UUID showtimeUuid, UUID currentUserUuid, OffsetDateTime now) {
        @SuppressWarnings("unchecked")
        List<Object> rows = entityManager.createNativeQuery("""
                select seat_uuid
                from seat_locked
                where showtime_uuid = :showtimeUuid
                  and user_uuid = :userUuid
                  and expired_at > :now
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("userUuid", currentUserUuid)
                .setParameter("now", now)
                .getResultList();

        Set<UUID> seatUuids = new LinkedHashSet<>();
        for (Object row : rows) {
            seatUuids.add(toUuid(row));
        }
        return seatUuids;
    }

    private void releaseSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToRelease) {
        if (seatUuidsToRelease.isEmpty()) {
            return;
        }
        entityManager.createNativeQuery("""
                delete from seat_locked
                where showtime_uuid = :showtimeUuid
                  and user_uuid = :userUuid
                  and seat_uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("userUuid", currentUserUuid)
                .setParameter("seatUuids", seatUuidsToRelease)
                .executeUpdate();
    }

    private void refreshSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToKeep,
            OffsetDateTime now, OffsetDateTime expiresAt) {
        if (seatUuidsToKeep.isEmpty()) {
            return;
        }
        entityManager.createNativeQuery("""
                update seat_locked
                set locked_at = :now,
                    expired_at = :expiresAt
                where showtime_uuid = :showtimeUuid
                  and user_uuid = :userUuid
                  and seat_uuid in (:seatUuids)
                """)
                .setParameter("showtimeUuid", showtimeUuid)
                .setParameter("userUuid", currentUserUuid)
                .setParameter("seatUuids", seatUuidsToKeep)
                .setParameter("now", now)
                .setParameter("expiresAt", expiresAt)
                .executeUpdate();
    }

    private void insertSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToInsert,
            OffsetDateTime now, OffsetDateTime expiresAt) {
        for (UUID seatUuid : seatUuidsToInsert) {
            try {
                entityManager.createNativeQuery("""
                        insert into seat_locked (uuid, showtime_uuid, seat_uuid, user_uuid, locked_at, expired_at)
                        values (:uuid, :showtimeUuid, :seatUuid, :userUuid, :now, :expiresAt)
                        """)
                        .setParameter("uuid", UUID.randomUUID())
                        .setParameter("showtimeUuid", showtimeUuid)
                        .setParameter("seatUuid", seatUuid)
                        .setParameter("userUuid", currentUserUuid)
                        .setParameter("now", now)
                        .setParameter("expiresAt", expiresAt)
                        .executeUpdate();
            } catch (DataIntegrityViolationException | jakarta.persistence.PersistenceException ex) {
                throw new AppException(ErrorCode.CONFLICT, "Ghe dang duoc nguoi khac giu");
            }
        }
    }

    private Set<UUID> normalizeSelectedSeatUuids(Collection<UUID> selectedSeatUuids) {
        if (selectedSeatUuids == null || selectedSeatUuids.isEmpty()) {
            return Set.of();
        }
        return new LinkedHashSet<>(selectedSeatUuids);
    }

    private List<UUID> normalizeRequestedSeatUuids(Collection<UUID> seatUuids) {
        if (seatUuids == null || seatUuids.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<UUID> normalized = new LinkedHashSet<>(seatUuids);
        if (normalized.size() != seatUuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach ghe bi trung");
        }
        if (normalized.size() > 8) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Khong duoc chon qua 8 ghe cho moi lan dat");
        }
        return new ArrayList<>(normalized);
    }

    private UUID resolveCurrentUserUuid(String currentUserEmail) {
        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(currentUserEmail)
                .map(user -> user.getId())
                .orElse(null);
    }

    private UUID resolveRequiredCurrentUserUuid(String currentUserEmail) {
        UUID currentUserUuid = resolveCurrentUserUuid(currentUserEmail);
        if (currentUserUuid == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return currentUserUuid;
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
