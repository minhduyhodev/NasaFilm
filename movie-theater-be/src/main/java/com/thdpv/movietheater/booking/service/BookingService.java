package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.BookingCombo;
import com.thdpv.movietheater.booking.entity.BookingSeat;
import com.thdpv.movietheater.booking.entity.Ticket;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.ComboPrice;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.LockedSeat;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.SeatGapState;
import com.thdpv.movietheater.booking.repository.BookingComboRepository;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.persistence.PersistenceException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final String BOOKING_STATUS_CONFIRMED = "CONFIRMED";
    private static final String TICKET_STATUS_ISSUED = "ISSUED";

    private final UserRepository userRepository;
    private final BookingRepository bookingJpaRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingComboRepository bookingComboRepository;
    private final TicketRepository ticketRepository;
    private final BookingNativeRepository bookingRepository;

    @Transactional
    public BookingResponse confirmBooking(String currentUserEmail, ConfirmBookingRequest request) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> seatUuids = normalizeSeatUuids(request.getSeatUuids());
        Map<UUID, Integer> comboQuantities = normalizeCombos(request.getCombos());

        assertShowtimeExists(request.getShowtimeUuid());
        bookingRepository.cleanupExpiredLocks(request.getShowtimeUuid(), now);

        List<LockedSeat> lockedSeats = bookingRepository.lockActiveSeatsForConfirm(
                request.getShowtimeUuid(), userUuid, seatUuids, now);
        if (lockedSeats.size() != seatUuids.size()) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe chua duoc giu hoac da het han giu ghe");
        }

        ensureNoBookedSeats(request.getShowtimeUuid(), seatUuids);
        validateNoSingleSeatGap(request.getShowtimeUuid(), seatUuids, now);

        List<ResolvedCombo> combos = resolveCombos(comboQuantities);
        BigDecimal seatTotal = lockedSeats.stream()
                .map(LockedSeat::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal comboTotal = combos.stream()
                .map(ResolvedCombo::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPrice = seatTotal.add(comboTotal);

        UUID bookingUuid = UUID.randomUUID();
        bookingJpaRepository.save(new Booking(
                bookingUuid,
                userUuid,
                request.getShowtimeUuid(),
                totalPrice,
                BOOKING_STATUS_CONFIRMED,
                now,
                now,
                now,
                userUuid,
                userUuid));

        List<BookingResponse.SeatLine> seatLines = new ArrayList<>();
        List<BookingResponse.TicketLine> ticketLines = new ArrayList<>();
        try {
            for (LockedSeat seat : lockedSeats) {
                UUID bookingSeatUuid = UUID.randomUUID();
                bookingSeatRepository.save(new BookingSeat(
                        bookingSeatUuid, bookingUuid, request.getShowtimeUuid(), seat.seatUuid(), seat.price()));
                seatLines.add(new BookingResponse.SeatLine(
                        seat.seatUuid(), seat.rowName(), seat.seatNumber(), seat.price()));

                UUID ticketUuid = UUID.randomUUID();
                String ticketCode = generateTicketCode();
                String qrCode = ticketCode;
                ticketRepository.save(new Ticket(
                        ticketUuid, bookingUuid, bookingSeatUuid, ticketCode, qrCode, TICKET_STATUS_ISSUED, now));
                ticketLines.add(new BookingResponse.TicketLine(ticketUuid, bookingSeatUuid, ticketCode, qrCode));
            }
        } catch (DataIntegrityViolationException | PersistenceException ex) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe da duoc dat boi giao dich khac");
        }

        List<BookingResponse.ComboLine> comboLines = new ArrayList<>();
        for (ResolvedCombo combo : combos) {
            bookingComboRepository.save(new BookingCombo(
                    UUID.randomUUID(), bookingUuid, combo.comboUuid(), combo.quantity(), combo.lineTotal()));
            comboLines.add(new BookingResponse.ComboLine(
                    combo.comboUuid(), combo.name(), combo.quantity(), combo.lineTotal()));
        }

        int scoreAdded = calculateScore(totalPrice);
        if (scoreAdded > 0) {
            bookingRepository.addUserScore(userUuid, scoreAdded);
            bookingRepository.insertScoreHistory(userUuid, scoreAdded, bookingUuid, now);
        }

        bookingRepository.deleteSeatLocks(request.getShowtimeUuid(), userUuid, seatUuids);

        return new BookingResponse(
                bookingUuid,
                request.getShowtimeUuid(),
                BOOKING_STATUS_CONFIRMED,
                totalPrice,
                scoreAdded,
                now,
                seatLines,
                comboLines,
                ticketLines);
    }

    private void assertShowtimeExists(UUID showtimeUuid) {
        if (!bookingRepository.existsShowtime(showtimeUuid)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }
    }

    private void ensureNoBookedSeats(UUID showtimeUuid, List<UUID> seatUuids) {
        if (bookingRepository.countBookedSeats(showtimeUuid, seatUuids) > 0L) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe da duoc dat");
        }
    }

    private List<ResolvedCombo> resolveCombos(Map<UUID, Integer> comboQuantities) {
        if (comboQuantities.isEmpty()) {
            return List.of();
        }

        List<ComboPrice> comboPrices = bookingRepository.loadCombos(comboQuantities.keySet());
        if (comboPrices.size() != comboQuantities.size()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Combo khong ton tai");
        }

        List<ResolvedCombo> combos = new ArrayList<>();
        for (ComboPrice comboPrice : comboPrices) {
            if (comboPrice.status() != null && !"ACTIVE".equalsIgnoreCase(comboPrice.status())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Combo khong kha dung");
            }

            int quantity = comboQuantities.get(comboPrice.comboUuid());
            BigDecimal lineTotal = comboPrice.unitPrice().multiply(BigDecimal.valueOf(quantity));
            combos.add(new ResolvedCombo(comboPrice.comboUuid(), comboPrice.name(), quantity, lineTotal));
        }
        return combos;
    }

    private void validateNoSingleSeatGap(UUID showtimeUuid, List<UUID> selectedSeatUuids, OffsetDateTime now) {
        Set<UUID> selectedSeatUuidSet = new LinkedHashSet<>(selectedSeatUuids);
        Map<String, List<GapSeat>> seatsByRow = new LinkedHashMap<>();

        for (SeatGapState state : bookingRepository.loadSeatGapStates(showtimeUuid, now)) {
            boolean unavailable = selectedSeatUuidSet.contains(state.seatUuid())
                    || state.booked()
                    || state.locked()
                    || (state.seatStatus() != null && !"ACTIVE".equalsIgnoreCase(state.seatStatus()));
            GapSeat gapSeat = new GapSeat(state.rowName(), state.seatNumber(), unavailable);
            seatsByRow.computeIfAbsent(gapSeat.rowName(), ignored -> new ArrayList<>()).add(gapSeat);
        }

        for (List<GapSeat> rowSeats : seatsByRow.values()) {
            int segmentStart = 0;
            while (segmentStart < rowSeats.size()) {
                int segmentEnd = segmentStart;
                while (segmentEnd + 1 < rowSeats.size()
                        && rowSeats.get(segmentEnd + 1).seatNumber() == rowSeats.get(segmentEnd).seatNumber() + 1) {
                    segmentEnd++;
                }

                for (int i = segmentStart + 1; i < segmentEnd; i++) {
                    GapSeat current = rowSeats.get(i);
                    if (!current.unavailable()
                            && rowSeats.get(i - 1).unavailable()
                            && rowSeats.get(i + 1).unavailable()) {
                        throw new AppException(ErrorCode.BAD_REQUEST, "Khong duoc de trong 1 ghe le bi kep giua");
                    }
                }
                segmentStart = segmentEnd + 1;
            }
        }
    }

    private UUID resolveRequiredUserUuid(String currentUserEmail) {
        if (currentUserEmail == null || currentUserEmail.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(currentUserEmail)
                .map(user -> user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    private List<UUID> normalizeSeatUuids(Collection<UUID> seatUuids) {
        LinkedHashSet<UUID> normalized = new LinkedHashSet<>(seatUuids);
        if (normalized.size() != seatUuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Danh sach ghe bi trung");
        }
        return new ArrayList<>(normalized);
    }

    private Map<UUID, Integer> normalizeCombos(List<ConfirmBookingRequest.ComboItem> comboItems) {
        if (comboItems == null || comboItems.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Integer> comboQuantities = new LinkedHashMap<>();
        for (ConfirmBookingRequest.ComboItem item : comboItems) {
            comboQuantities.merge(item.getComboUuid(), item.getQuantity(), Integer::sum);
        }
        return comboQuantities;
    }

    private int calculateScore(BigDecimal totalPrice) {
        return totalPrice.divide(BigDecimal.valueOf(10000), 0, RoundingMode.DOWN).intValue();
    }

    private String generateTicketCode() {
        return "TK" + OffsetDateTime.now(ZoneOffset.UTC).toInstant().toEpochMilli()
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private record ResolvedCombo(UUID comboUuid, String name, Integer quantity, BigDecimal lineTotal) {
    }

    private record GapSeat(String rowName, Integer seatNumber, boolean unavailable) {
    }
}
