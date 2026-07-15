package com.thdpv.movietheater.staff.service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.response.CheckInTicketResponse;
import com.thdpv.movietheater.booking.service.AuditLogService;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.staff.dto.response.StaffCheckInResponse;
import com.thdpv.movietheater.staff.dto.response.StaffGateEventResponse;
import com.thdpv.movietheater.staff.dto.response.StaffComboStatItem;
import com.thdpv.movietheater.staff.dto.response.StaffShowtimeStatsResponse;
import com.thdpv.movietheater.staff.dto.response.StaffShowtimeSummaryResponse;
import com.thdpv.movietheater.staff.repository.StaffMissionControlRepository;

@Service
public class StaffMissionControlService {

    private static final double ALMOST_FULL_THRESHOLD = 90.0;
    private static final DateTimeFormatter SHOWTIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm · dd/MM/yyyy");

    private final StaffMissionControlRepository staffRepository;
    private final BookingService bookingService;
    private final StaffGateEventService staffGateEventService;
    private final AuditLogService auditLogService;

    public StaffMissionControlService(
            StaffMissionControlRepository staffRepository,
            BookingService bookingService,
            StaffGateEventService staffGateEventService,
            AuditLogService auditLogService) {
        this.staffRepository = staffRepository;
        this.bookingService = bookingService;
        this.staffGateEventService = staffGateEventService;
        this.auditLogService = auditLogService;
    }

    /** Khớp MovieDetailPage.jsx — 4 tab ngày (hôm nay + 3 ngày tới). */
    private static final int SHOWTIME_BOOKING_TAB_DAYS = 4;
    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    @Transactional(readOnly = true)
    public List<StaffShowtimeSummaryResponse> listOperationalShowtimes() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime rangeEnd = resolvePublicBookingRangeEnd(now);

        return staffRepository.findOperationalShowtimes(now, rangeEnd).stream()
                .map(this::mapShowtimeSummary)
                .toList();
    }

    /** Cùng logic cửa sổ với ShowtimeService.getPublicShowtimes / tab ngày trên MovieDetailPage. */
    private OffsetDateTime resolvePublicBookingRangeEnd(OffsetDateTime now) {
        LocalDate today = now.withOffsetSameInstant(VIETNAM_OFFSET).toLocalDate();
        return today.plusDays(SHOWTIME_BOOKING_TAB_DAYS).atStartOfDay().atOffset(VIETNAM_OFFSET);
    }

    @Transactional(readOnly = true)
    public StaffShowtimeStatsResponse getShowtimeStats(UUID showtimeUuid) {
        OffsetDateTime now = OffsetDateTime.now();
        List<Object[]> rows = staffRepository.findShowtimeOccupancy(showtimeUuid, now);
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy suất chiếu");
        }

        Object[] row = rows.get(0);
        int capacity = toInt(row[0]);
        int soldSeats = toInt(row[1]);
        int lockedSeats = toInt(row[2]);
        String movieTitle = stringValue(row[3]);
        String cinemaName = stringValue(row[4]);
        String roomName = stringValue(row[5]);
        OffsetDateTime startTime = toOffsetDateTime(row[6]);

        int availableSeats = Math.max(0, capacity - soldSeats - lockedSeats);
        double occupancyPercent = computeOccupancyPercent(capacity, soldSeats, lockedSeats);
        boolean almostFull = occupancyPercent >= ALMOST_FULL_THRESHOLD;

        long checkedInBookings = staffRepository.countCheckedInTickets(showtimeUuid);
        int vipTotal = (int) staffRepository.countVipSeatsTotal(showtimeUuid);
        int vipAvailable = (int) staffRepository.countVipSeatsAvailable(showtimeUuid, now);

        List<StaffComboStatItem> topCombos = staffRepository.findTopCombosByShowtime(showtimeUuid).stream()
                .map(comboRow -> new StaffComboStatItem(
                        stringValue(comboRow[0]),
                        toLong(comboRow[1])))
                .toList();

        return new StaffShowtimeStatsResponse(
                showtimeUuid,
                movieTitle,
                cinemaName,
                roomName,
                startTime,
                capacity,
                soldSeats,
                lockedSeats,
                availableSeats,
                occupancyPercent,
                almostFull,
                (int) checkedInBookings,
                vipTotal,
                vipAvailable,
                topCombos);
    }

    @Transactional
    public StaffCheckInResponse previewTicket(String ticketCode, String staffEmail, String scanSource) {
        String normalized = ticketCode != null ? ticketCode.trim() : "";
        try {
            return buildCheckInResponse(normalized);
        } catch (AppException ex) {
            staffGateEventService.logPreviewFailed(staffEmail, scanSource, normalized, ex.getMessage());
            throw ex;
        }
    }

    @Transactional
    public StaffCheckInResponse checkInTicket(String ticketCode, String staffEmail, String scanSource,
            UUID gateShowtimeUuid) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã vé không hợp lệ");
        }

        String normalizedCode = ticketCode.trim();
        UUID gateRoomUuid = gateShowtimeUuid != null
                ? staffRepository.findRoomUuidByShowtime(gateShowtimeUuid)
                : null;
        StaffCheckInResponse preview;
        try {
            preview = buildCheckInResponse(normalizedCode);
        } catch (AppException ex) {
            staffGateEventService.logCheckInFailed(staffEmail, scanSource, normalizedCode, ex.getMessage(), null);
            throw ex;
        }

        if (preview.alreadyCheckedIn()) {
            staffGateEventService.logCheckInAlreadyUsed(staffEmail, scanSource, preview);
            return preview;
        }

        try {
            CheckInTicketResponse checkInResult = bookingService.checkInTicket(normalizedCode, gateRoomUuid);
            if (!"VALID".equalsIgnoreCase(checkInResult.getStatus())) {
                throw new AppException(
                        ErrorCode.BAD_REQUEST,
                        checkInResult.getMessage() != null && !checkInResult.getMessage().isBlank()
                                ? checkInResult.getMessage()
                                : "Vé không hợp lệ để soát");
            }
            StaffCheckInResponse result = buildCheckInResponse(normalizedCode);
            staffGateEventService.logCheckInSuccess(staffEmail, scanSource, result);
            UUID staffUuid = staffGateEventService.resolveStaffUuidForAudit(staffEmail);
            auditLogService.log(
                    "TICKET",
                    result.bookingUuid(),
                    "TICKET_CHECKED_IN",
                    staffUuid,
                    "STAFF",
                    staffGateEventService.auditPayload(result, scanSource));
            return result;
        } catch (AppException ex) {
            staffGateEventService.logCheckInFailed(staffEmail, scanSource, normalizedCode, ex.getMessage(), preview);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<StaffGateEventResponse> listRecentGateEvents(
            UUID showtimeUuid,
            int limit) {
        return staffGateEventService.listRecentCheckIns(showtimeUuid, limit);
    }

    private StaffCheckInResponse buildCheckInResponse(String ticketCode) {
        List<Object[]> rows = staffRepository.findTicketCheckInContext(ticketCode);
        if (rows.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy vé");
        }

        Object[] row = rows.get(0);
        String code = stringValue(row[0]);
        String status = stringValue(row[1]);
        OffsetDateTime checkedInAt = toOffsetDateTime(row[2]);
        UUID bookingUuid = toUuid(row[3]);
        UUID showtimeUuid = toUuid(row[4]);
        String customerName = stringValue(row[5]);
        String movieTitle = stringValue(row[6]);
        String cinemaName = stringValue(row[7]);
        String roomName = stringValue(row[8]);
        OffsetDateTime startTime = toOffsetDateTime(row[9]);
        String bookingType = stringValue(row[11]);
        String bookingStatus = stringValue(row[12]);

        assertTheaterTicketEligible(bookingType, showtimeUuid);
        assertBookingNotCancelled(bookingStatus);

        List<String> seatLabels = bookingUuid == null
                ? List.of()
                : staffRepository.findSeatLabelsByBooking(bookingUuid).stream()
                        .filter(label -> label != null && !label.isBlank())
                        .toList();

        boolean alreadyCheckedIn = "USED".equalsIgnoreCase(status);
        String showtimeDisplay = startTime != null
                ? startTime.atZoneSameInstant(ZoneOffset.ofHours(7)).format(SHOWTIME_FORMAT)
                : "";

        return new StaffCheckInResponse(
                bookingUuid,
                showtimeUuid,
                code,
                customerName,
                movieTitle,
                cinemaName,
                roomName,
                showtimeDisplay,
                startTime,
                seatLabels,
                status,
                checkedInAt,
                alreadyCheckedIn);
    }

    private void assertTheaterTicketEligible(String bookingType, UUID showtimeUuid) {
        if ("ONLINE".equalsIgnoreCase(bookingType) || showtimeUuid == null) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "Vé xem online (VOD) không dùng để soát vé tại rạp");
        }
    }

    private void assertBookingNotCancelled(String bookingStatus) {
        if (bookingStatus == null || bookingStatus.isBlank()) {
            return;
        }
        String normalized = bookingStatus.toUpperCase();
        boolean cancelled = "CANCELLED".equals(normalized)
                || "REFUNDED".equals(normalized)
                || "REFUND_PENDING".equals(normalized)
                || "REFUND_PROCESSING".equals(normalized)
                || "CANCELLING".equals(normalized);
        if (cancelled) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "Vé đã bị hủy hoặc đang hoàn tiền — không hợp lệ để soát");
        }
    }

    private StaffShowtimeSummaryResponse mapShowtimeSummary(Object[] row) {
        UUID showtimeUuid = toUuid(row[0]);
        UUID movieUuid = toUuid(row[1]);
        String movieTitle = stringValue(row[2]);
        String posterUrl = stringValue(row[3]);
        String cinemaName = stringValue(row[4]);
        String roomName = stringValue(row[5]);
        OffsetDateTime startTime = toOffsetDateTime(row[6]);
        int capacity = toInt(row[7]);
        int soldSeats = toInt(row[8]);
        int lockedSeats = toInt(row[9]);
        int availableSeats = Math.max(0, capacity - soldSeats - lockedSeats);
        double occupancyPercent = computeOccupancyPercent(capacity, soldSeats, lockedSeats);

        return new StaffShowtimeSummaryResponse(
                showtimeUuid,
                movieUuid,
                movieTitle,
                posterUrl,
                cinemaName,
                roomName,
                startTime,
                capacity,
                soldSeats,
                lockedSeats,
                availableSeats,
                occupancyPercent,
                occupancyPercent >= ALMOST_FULL_THRESHOLD);
    }

    private double computeOccupancyPercent(int capacity, int soldSeats, int lockedSeats) {
        if (capacity <= 0) {
            return 0.0;
        }
        double rate = ((soldSeats + lockedSeats) * 100.0) / capacity;
        return Math.round(rate * 10.0) / 10.0;
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
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
        return OffsetDateTime.parse(value.toString());
    }
}
