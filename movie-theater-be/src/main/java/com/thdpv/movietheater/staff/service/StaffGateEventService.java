package com.thdpv.movietheater.staff.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.staff.dto.response.StaffCheckInResponse;
import com.thdpv.movietheater.staff.dto.response.StaffGateEventResponse;
import com.thdpv.movietheater.staff.entity.StaffGateEvent;
import com.thdpv.movietheater.staff.repository.StaffGateEventRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class StaffGateEventService {

    public static final String EVENT_PREVIEW_FAILED = "TICKET_PREVIEW_FAILED";
    public static final String EVENT_CHECK_IN_SUCCESS = "TICKET_CHECK_IN_SUCCESS";
    public static final String EVENT_CHECK_IN_ALREADY_USED = "TICKET_CHECK_IN_ALREADY_USED";
    public static final String EVENT_CHECK_IN_FAILED = "TICKET_CHECK_IN_FAILED";

    private static final Set<String> RECENT_CHECK_IN_TYPES = Set.of(
            EVENT_CHECK_IN_SUCCESS,
            EVENT_CHECK_IN_ALREADY_USED);

    private final StaffGateEventRepository staffGateEventRepository;
    private final UserRepository userRepository;

    public StaffGateEventService(
            StaffGateEventRepository staffGateEventRepository,
            UserRepository userRepository) {
        this.staffGateEventRepository = staffGateEventRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StaffGateEventResponse> listRecentCheckIns(UUID showtimeUuid, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        return staffGateEventRepository
                .findByShowtimeUuidAndEventTypeInOrderByCreatedAtDesc(
                        showtimeUuid,
                        RECENT_CHECK_IN_TYPES,
                        PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logPreviewFailed(String staffEmail, String scanSource, String ticketCode, String errorMessage) {
        persistBare(staffEmail, scanSource, EVENT_PREVIEW_FAILED, ticketCode, errorMessage, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCheckInSuccess(String staffEmail, String scanSource, StaffCheckInResponse response) {
        persist(staffEmail, scanSource, EVENT_CHECK_IN_SUCCESS, response, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCheckInAlreadyUsed(String staffEmail, String scanSource, StaffCheckInResponse response) {
        persist(staffEmail, scanSource, EVENT_CHECK_IN_ALREADY_USED, response, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCheckInFailed(
            String staffEmail,
            String scanSource,
            String ticketCode,
            String errorMessage,
            StaffCheckInResponse partial) {
        if (partial != null) {
            persist(staffEmail, scanSource, EVENT_CHECK_IN_FAILED, partial, errorMessage);
            return;
        }
        persistBare(staffEmail, scanSource, EVENT_CHECK_IN_FAILED, ticketCode, errorMessage, null, null);
    }

    private void persist(
            String staffEmail,
            String scanSource,
            String eventType,
            StaffCheckInResponse response,
            String errorMessage) {
        persistBare(
                staffEmail,
                scanSource,
                eventType,
                response.ticketCode(),
                errorMessage,
                response,
                resolveStaffUuid(staffEmail));
    }

    private void persistBare(
            String staffEmail,
            String scanSource,
            String eventType,
            String ticketCode,
            String errorMessage,
            StaffCheckInResponse response,
            UUID staffUuid) {
        StaffGateEvent event = new StaffGateEvent();
        event.setUuid(UUID.randomUUID());
        event.setTicketCode(normalizeTicketCode(ticketCode));
        event.setEventType(eventType);
        event.setStaffEmail(staffEmail);
        event.setStaffUuid(staffUuid != null ? staffUuid : resolveStaffUuid(staffEmail));
        event.setScanSource(normalizeScanSource(scanSource));
        event.setErrorMessage(errorMessage);
        event.setCreatedAt(OffsetDateTime.now());

        if (response != null) {
            event.setShowtimeUuid(response.showtimeUuid());
            event.setBookingUuid(response.bookingUuid());
            event.setCustomerName(response.customerName());
            event.setMovieTitle(response.movieTitle());
            event.setSeatLabels(formatSeatLabels(response.seatLabels()));
        }

        staffGateEventRepository.save(event);
    }

    public UUID resolveStaffUuidForAudit(String staffEmail) {
        return resolveStaffUuid(staffEmail);
    }

    private StaffGateEventResponse toResponse(StaffGateEvent event) {
        return new StaffGateEventResponse(
                event.getUuid(),
                event.getShowtimeUuid(),
                event.getBookingUuid(),
                event.getTicketCode(),
                event.getEventType(),
                event.getStaffEmail(),
                event.getCustomerName(),
                event.getMovieTitle(),
                event.getSeatLabels(),
                event.getErrorMessage(),
                event.getScanSource(),
                event.getCreatedAt());
    }

    private UUID resolveStaffUuid(String staffEmail) {
        if (staffEmail == null || staffEmail.isBlank()) {
            return null;
        }
        Optional<User> user = userRepository.findByEmailIgnoreCase(staffEmail.trim());
        return user.map(User::getId).orElse(null);
    }

    private String normalizeTicketCode(String ticketCode) {
        if (ticketCode == null || ticketCode.isBlank()) {
            return "UNKNOWN";
        }
        return ticketCode.trim();
    }

    private String normalizeScanSource(String scanSource) {
        if (scanSource == null || scanSource.isBlank()) {
            return "MANUAL";
        }
        return scanSource.trim().toUpperCase();
    }

    private String formatSeatLabels(List<String> seatLabels) {
        if (seatLabels == null || seatLabels.isEmpty()) {
            return null;
        }
        return String.join(", ", seatLabels);
    }

    public Map<String, Object> auditPayload(StaffCheckInResponse response, String scanSource) {
        return Map.of(
                "ticketCode", response.ticketCode(),
                "customerName", response.customerName() != null ? response.customerName() : "",
                "movieTitle", response.movieTitle() != null ? response.movieTitle() : "",
                "seatLabels", response.seatLabels() != null ? response.seatLabels() : List.of(),
                "scanSource", normalizeScanSource(scanSource));
    }
}
