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
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.cinema.service.CinemaService;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.config.service.SystemConfigService;

import lombok.RequiredArgsConstructor;
import com.thdpv.movietheater.booking.repository.SeatLockedRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;

@Service
@RequiredArgsConstructor
public class ShowtimeSeatService {

    @Value("${app.showtime.auto-slide-enabled:false}")
    private boolean autoSlideEnabled;

    private final SystemConfigService systemConfigService;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingNativeRepository bookingRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final CinemaService cinemaService;
    private final SeatLockedRepository seatLockedRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatMapEventPublisher seatMapEventPublisher;
    private final ShowtimeCapacityService showtimeCapacityService;
    private final SeatMapWatchRegistry seatMapWatchRegistry;

    public void registerSeatMapWatch(UUID showtimeUuid) {
        bookingRepository.ensureShowtimeExists(showtimeUuid);
        seatMapWatchRegistry.register(showtimeUuid);
    }

    public void unregisterSeatMapWatch(UUID showtimeUuid) {
        seatMapWatchRegistry.unregister(showtimeUuid);
    }

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
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND, "Chua co so do ghe cho suat chieu nay");
        }

        UUID responseShowtimeUuid = rows.get(0).getShowtimeUuid();
        UUID cinemaRoomUuid = rows.get(0).getCinemaRoomUuid();
        OffsetDateTime startTime = rows.get(0).getStartTime();
        OffsetDateTime endTime = rows.get(0).getEndTime();

        Map<String, List<ShowtimeSeatMapResponse.SeatItem>> seatRows = new LinkedHashMap<>();
        for (SeatViewDto row : rows) {
            ShowtimeSeatMapResponse.SeatItem seatItem = mapSeatRow(row, currentUserUuid, selectedSet);
            seatRows.computeIfAbsent(row.getRowName(), ignored -> new ArrayList<>())
                    .add(seatItem);
        }

        applySingleGapBlocking(seatRows);

        List<ShowtimeSeatMapResponse.RowItem> responseRows = new ArrayList<>();
        for (Map.Entry<String, List<ShowtimeSeatMapResponse.SeatItem>> entry : seatRows.entrySet()) {
            responseRows.add(new ShowtimeSeatMapResponse.RowItem(entry.getKey(), entry.getValue()));
        }

        int lockTtlSeconds = systemConfigService.getSeatLockTtlSeconds();
        return new ShowtimeSeatMapResponse(
                responseShowtimeUuid,
                cinemaRoomUuid,
                startTime,
                endTime,
                lockTtlSeconds,
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
        int lockTtlSeconds = systemConfigService.getSeatLockTtlSeconds();
        OffsetDateTime expiresAt = now.plusSeconds(lockTtlSeconds);
        List<UUID> requestedSeatUuids = normalizeRequestedSeatUuids(request.getSeatUuids());

        assertShowtimeValidForBooking(request.getShowtimeUuid(), now);
        cleanupExpiredLocks(request.getShowtimeUuid(), now);
        validateRequestedSeatsBelongToShowtime(request.getShowtimeUuid(), requestedSeatUuids);
        validateSeatsAreBookable(request.getShowtimeUuid(), requestedSeatUuids);
        showtimeCapacityService.validateCapacity(
                request.getShowtimeUuid(), requestedSeatUuids.size(), currentUserUuid, now);
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

        seatMapEventPublisher.notifySeatMapUpdated(request.getShowtimeUuid());

        return new SeatLockSyncResponse(
                request.getShowtimeUuid(),
                lockTtlSeconds,
                requestedSeatUuids.isEmpty() ? null : expiresAt,
                now,
                requestedSeatUuids);
    }

    private ShowtimeSeatMapResponse.SeatItem mapSeatRow(SeatViewDto row, UUID currentUserUuid, Set<UUID> selectedSet) {
        UUID seatUuid = row.getSeatUuid();
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

        return new ShowtimeSeatMapResponse.SeatItem(
                seatUuid,
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

    private void applySingleGapBlocking(Map<String, List<ShowtimeSeatMapResponse.SeatItem>> seatRows) {
        for (List<ShowtimeSeatMapResponse.SeatItem> seats : seatRows.values()) {
            int segmentStart = 0;
            while (segmentStart < seats.size()) {
                int segmentEnd = segmentStart;
                while (segmentEnd + 1 < seats.size()
                        && seats.get(segmentEnd + 1).getSeatNumber() == seats.get(segmentEnd).getSeatNumber() + 1) {
                    segmentEnd++;
                }

                for (int i = segmentStart; i <= segmentEnd; i++) {
                    ShowtimeSeatMapResponse.SeatItem current = seats.get(i);
                    if (!isPlainAvailable(current) || "COUPLE".equalsIgnoreCase(current.getSeatTypeName())) {
                        continue;
                    }

                    boolean leftUnavailable = (i == segmentStart) || isUnavailableForGapRule(seats.get(i - 1));
                    boolean rightUnavailable = (i == segmentEnd) || isUnavailableForGapRule(seats.get(i + 1));

                    if (leftUnavailable && rightUnavailable) {
                        boolean leftSelectedByMe = (i != segmentStart) && (Boolean.TRUE.equals(seats.get(i - 1).getSelected())
                                || "LOCKED_BY_ME".equals(seats.get(i - 1).getAvailabilityStatus()));
                        boolean rightSelectedByMe = (i != segmentEnd) && (Boolean.TRUE.equals(seats.get(i + 1).getSelected())
                                || "LOCKED_BY_ME".equals(seats.get(i + 1).getAvailabilityStatus()));
                        if (leftSelectedByMe || rightSelectedByMe) {
                            current.setBlocked(true);
                        }
                    }
                }

                segmentStart = segmentEnd + 1;
            }
        }
    }

    private boolean isPlainAvailable(ShowtimeSeatMapResponse.SeatItem seat) {
        return "AVAILABLE".equals(seat.getAvailabilityStatus()) && !Boolean.TRUE.equals(seat.getSelected());
    }

    private boolean isUnavailableForGapRule(ShowtimeSeatMapResponse.SeatItem seat) {
        return !"AVAILABLE".equals(seat.getAvailabilityStatus()) || Boolean.TRUE.equals(seat.getSelected());
    }

    private String resolveAvailabilityStatus(String seatDbStatus, boolean booked, UUID lockedUserUuid,
            UUID currentUserUuid) {
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
        Showtime showtime = showtimeRepository.findById(showtimeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        if (showtime.getStatus() != com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suất chiếu không ở trạng thái mở bán vé, không thể thực hiện");
        }
        if (showtime.getStartTime().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da bat dau hoac da dien ra, khong the thuc hien");
        }
        CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid()).orElse(null);
        if (room != null && room.getStatus() != CinemaRoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong chieu khong o trang thai hoat dong");
        }
    }

    private void validateSeatsAreBookable(UUID showtimeUuid, List<UUID> requestedSeatUuids) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        long bookableCount = showtimeRepository.countBookableSeats(showtimeUuid, requestedSeatUuids);
        if (bookableCount != requestedSeatUuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Co ghe khong kha dung hoac dang bao tri");
        }
    }

    private void autoSlideShowtimeIfPast(UUID showtimeUuid, OffsetDateTime now) {
        if (bookingRepository.hasConfirmedBookings(showtimeUuid)) {
            return;
        }
        Showtime showtime = showtimeRepository.findById(showtimeUuid).orElse(null);
        if (showtime == null) {
            return;
        }
        OffsetDateTime startTime = showtime.getStartTime();
        OffsetDateTime endTime = showtime.getEndTime();
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
        seatLockedRepository.deleteExpiredLocks(showtimeUuid, now);
    }

    @Transactional
    @Scheduled(fixedDelay = 30000)
    public void cleanupExpiredLocksScheduled() {
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> affectedShowtimes = seatLockedRepository.findShowtimeUuidsWithExpiredLocks(now);
        if (affectedShowtimes.isEmpty()) {
            return;
        }
        seatLockedRepository.deleteExpiredLocksScheduled(now);
        affectedShowtimes.forEach(seatMapEventPublisher::notifySeatMapUpdated);
    }

    private void validateRequestedSeatsBelongToShowtime(UUID showtimeUuid, List<UUID> requestedSeatUuids) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        long count = showtimeRepository.countSeatsBelongingToShowtime(showtimeUuid, requestedSeatUuids);
        if (count != requestedSeatUuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Co ghe khong thuoc suat chieu nay");
        }
    }

    private void validateSeatsNotBooked(UUID showtimeUuid, List<UUID> requestedSeatUuids) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        long count = bookingSeatRepository.countBookedSeats(showtimeUuid, requestedSeatUuids);
        if (count > 0L) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe da duoc dat");
        }
    }

    private void validateSeatsNotLockedByOther(UUID showtimeUuid, List<UUID> requestedSeatUuids, UUID currentUserUuid,
            OffsetDateTime now) {
        if (requestedSeatUuids.isEmpty()) {
            return;
        }
        long count = seatLockedRepository.countLockedByOther(showtimeUuid, requestedSeatUuids, currentUserUuid, now);
        if (count > 0L) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe dang duoc nguoi khac giu");
        }
    }

    private Set<UUID> findCurrentLockedSeatUuids(UUID showtimeUuid, UUID currentUserUuid, OffsetDateTime now) {
        List<UUID> rows = seatLockedRepository.findLockedSeatUuids(showtimeUuid, currentUserUuid, now);
        return new LinkedHashSet<>(rows);
    }

    private void releaseSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToRelease) {
        if (seatUuidsToRelease.isEmpty()) {
            return;
        }
        seatLockedRepository.releaseSeatLocks(showtimeUuid, currentUserUuid, seatUuidsToRelease);
    }

    private void refreshSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToKeep,
            OffsetDateTime now, OffsetDateTime expiresAt) {
        if (seatUuidsToKeep.isEmpty()) {
            return;
        }
        seatLockedRepository.refreshSeatLocks(showtimeUuid, currentUserUuid, seatUuidsToKeep, now, expiresAt);
    }

    private void insertSeatLocks(UUID showtimeUuid, UUID currentUserUuid, List<UUID> seatUuidsToInsert,
            OffsetDateTime now, OffsetDateTime expiresAt) {
        for (UUID seatUuid : seatUuidsToInsert) {
            try {
                com.thdpv.movietheater.booking.entity.SeatLocked sl = new com.thdpv.movietheater.booking.entity.SeatLocked();
                sl.setShowtimeUuid(showtimeUuid);
                sl.setSeatUuid(seatUuid);
                sl.setUserUuid(currentUserUuid);
                sl.setLockedAt(now);
                sl.setExpiredAt(expiresAt);
                seatLockedRepository.saveAndFlush(sl);
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
        int maxSeats = systemConfigService.getMaxSeatsPerBooking();
        if (normalized.size() > maxSeats) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Khong duoc chon qua " + maxSeats + " ghe cho moi lan dat");
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
        if (value instanceof java.time.Instant instant) {
            return instant.atOffset(ZoneOffset.UTC);
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atOffset(ZoneOffset.UTC);
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atOffset(ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(value.toString());
    }


}
