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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.dto.response.CustomerBookingHistoryResponse;
import com.thdpv.movietheater.booking.dto.response.AdminBookingListResponse;
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
import com.thdpv.movietheater.booking.entity.Promotion;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.user.entity.User;

import jakarta.persistence.PersistenceException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final String BOOKING_STATUS_CONFIRMED = "CONFIRMED";
    private static final String TICKET_STATUS_ISSUED = "ISSUED";

    @Value("${app.showtime.auto-slide-enabled:false}")
    private boolean autoSlideEnabled;

    private final UserRepository userRepository;
    private final BookingRepository bookingJpaRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingComboRepository bookingComboRepository;
    private final TicketRepository ticketRepository;
    private final BookingNativeRepository bookingRepository;
    private final PromotionRepository promotionRepository;

    @Transactional
    public BookingResponse confirmBooking(String currentUserEmail, ConfirmBookingRequest request) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> seatUuids = normalizeSeatUuids(request.getSeatUuids());
        Map<UUID, Integer> comboQuantities = normalizeCombos(request.getCombos());

        if (autoSlideEnabled) {
            autoSlideShowtimeIfPast(request.getShowtimeUuid(), now);
        }
        assertShowtimeValidForBooking(request.getShowtimeUuid(), now);
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

        // Calculate combo discount based on member loyalty points (NASA'VIP >= 10000 gets 15% off, NASA'FRIEND gets 10% off)
        Integer userScore = userRepository.findById(userUuid)
                .map(User::getScore)
                .orElse(0);
        BigDecimal comboDiscountRate = userScore >= 10000 ? BigDecimal.valueOf(0.85) : BigDecimal.valueOf(0.90);

        BigDecimal comboTotal = BigDecimal.ZERO;
        List<ResolvedCombo> discountedResolvedCombos = new ArrayList<>();
        for (ResolvedCombo combo : combos) {
            BigDecimal discountedLineTotal = combo.lineTotal().multiply(comboDiscountRate).setScale(0, RoundingMode.HALF_UP);
            comboTotal = comboTotal.add(discountedLineTotal);
            discountedResolvedCombos.add(new ResolvedCombo(combo.comboUuid(), combo.name(), combo.quantity(), discountedLineTotal));
        }

        // Apply Promotion Code
        UUID promotionUuid = null;
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
            Promotion promotion = promotionRepository.findByCodeIgnoreCase(request.getPromotionCode().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi không tồn tại"));

            if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã hết hạn hoặc vô hiệu lực");
            }

            if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi chưa bắt đầu");
            }

            if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi đã kết thúc");
            }

            if (promotion.getMaxUsage() != null && promotion.getUsedCount() != null
                    && promotion.getUsedCount() >= promotion.getMaxUsage()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã đạt số lượt sử dụng tối đa");
            }

            if (Boolean.TRUE.equals(promotion.getOncePerUser())) {
                boolean alreadyUsed = bookingJpaRepository.existsByUserUuidAndPromotionUuid(userUuid, promotion.getId());
                if (alreadyUsed) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã sử dụng mã khuyến mãi này rồi");
                }
            }

            promotionUuid = promotion.getId();
            if ("PERCENTAGE".equalsIgnoreCase(promotion.getDiscountType())) {
                // Percentage discount applies to ticket sum (seatTotal)
                discountAmount = seatTotal.multiply(promotion.getDiscountValue()).setScale(0, RoundingMode.HALF_UP);
            } else if ("FIXED_AMOUNT".equalsIgnoreCase(promotion.getDiscountType())) {
                // Fixed amount discount applies directly
                discountAmount = promotion.getDiscountValue();
            }
        }

        BigDecimal subtotal = seatTotal.add(comboTotal);
        BigDecimal totalPrice = subtotal.subtract(discountAmount);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO;
        }

        UUID bookingUuid = UUID.randomUUID();
        Booking booking = new Booking(
                bookingUuid,
                userUuid,
                request.getShowtimeUuid(),
                totalPrice,
                BOOKING_STATUS_CONFIRMED,
                now,
                now,
                now,
                userUuid,
                userUuid);
        booking.setPromotionUuid(promotionUuid);
        bookingJpaRepository.save(booking);

        if (promotionUuid != null) {
            Promotion promotion = promotionRepository.findById(promotionUuid).orElse(null);
            if (promotion != null) {
                promotion.setUsedCount(promotion.getUsedCount() + 1);
                promotionRepository.save(promotion);
            }
        }

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
        for (ResolvedCombo combo : discountedResolvedCombos) {
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

    private void assertShowtimeValidForBooking(UUID showtimeUuid, OffsetDateTime now) {
        if (!bookingRepository.existsShowtime(showtimeUuid)) {
            throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
        }
        OffsetDateTime startTime = bookingRepository.getShowtimeStartTime(showtimeUuid);
        if (startTime != null && startTime.isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da bat dau hoac da dien ra, khong the thuc hien");
        }
    }

    private void autoSlideShowtimeIfPast(UUID showtimeUuid, OffsetDateTime now) {
        OffsetDateTime startTime = bookingRepository.getShowtimeStartTime(showtimeUuid);
        if (startTime != null && startTime.isBefore(now)) {
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
            boolean selectedByUser = selectedSeatUuidSet.contains(state.seatUuid());
            boolean unavailable = selectedByUser
                    || state.booked()
                    || state.locked()
                    || (state.seatStatus() != null && !"ACTIVE".equalsIgnoreCase(state.seatStatus()));
            GapSeat gapSeat = new GapSeat(state.rowName(), state.seatNumber(), unavailable, selectedByUser);
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

                for (int i = segmentStart; i <= segmentEnd; i++) {
                    GapSeat current = rowSeats.get(i);
                    if (current.unavailable()) {
                        continue;
                    }

                    boolean leftUnavailable = (i == segmentStart) || rowSeats.get(i - 1).unavailable();
                    boolean rightUnavailable = (i == segmentEnd) || rowSeats.get(i + 1).unavailable();

                    if (leftUnavailable && rightUnavailable) {
                        boolean leftSelectedByUser = (i != segmentStart) && rowSeats.get(i - 1).selectedByUser();
                        boolean rightSelectedByUser = (i != segmentEnd) && rowSeats.get(i + 1).selectedByUser();
                        if (leftSelectedByUser || rightSelectedByUser) {
                            throw new AppException(ErrorCode.BAD_REQUEST, "Khong duoc de trong 1 ghe le bi kep giua");
                        }
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
        if (normalized.size() > 8) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Khong duoc chon qua 8 ghe cho moi lan dat");
        }
        return new ArrayList<>(normalized);
    }

    private Map<UUID, Integer> normalizeCombos(List<ConfirmBookingRequest.ComboItem> comboItems) {
        if (comboItems == null || comboItems.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Integer> comboQuantities = new LinkedHashMap<>();
        for (ConfirmBookingRequest.ComboItem item : comboItems) {
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "So luong combo phai lon hon 0");
            }
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

    @Transactional(readOnly = true)
    public List<CustomerBookingHistoryResponse> getMyBookings(String email) {
        UUID userUuid = resolveRequiredUserUuid(email);
        List<Object[]> rows = bookingRepository.loadUserBookings(userUuid);
        List<CustomerBookingHistoryResponse> responses = new ArrayList<>();

        for (Object[] row : rows) {
            UUID bookingUuid = toUuid(row[0]);
            BigDecimal totalPrice = toBigDecimal(row[1]);
            String bookingStatus = stringValue(row[2]);
            OffsetDateTime startTime = bookingRepository.toOffsetDateTime(row[4]);
            String movieTitle = stringValue(row[5]);
            String roomName = stringValue(row[6]);

            // Load seats
            List<Object[]> seatsRows = bookingRepository.loadSeatsForBooking(bookingUuid);
            List<String> seatNames = new ArrayList<>();
            for (Object[] seatRow : seatsRows) {
                seatNames.add(stringValue(seatRow[0]) + seatRow[1]);
            }
            String seatsStr = String.join(", ", seatNames);

            // Load combos
            List<Object[]> comboRows = bookingRepository.loadCombosForBooking(bookingUuid);
            List<String> comboNames = new ArrayList<>();
            for (Object[] comboRow : comboRows) {
                comboNames.add(comboRow[1] + "x " + comboRow[0]);
            }
            String combosStr = comboNames.isEmpty() ? "Không kèm bắp nước" : String.join(", ", comboNames);

            // Load ticket code (first code)
            List<String> ticketCodes = bookingRepository.loadTicketCodesForBooking(bookingUuid);
            String ticketCode = ticketCodes.isEmpty() ? "" : ticketCodes.get(0);

            // Price format
            String priceStr = formatPrice(totalPrice);

            // Status: active if movie hasn't started yet, completed if movie has started/finished
            String status = startTime.isAfter(OffsetDateTime.now()) ? "active" : "completed";
            if ("CANCELLED".equalsIgnoreCase(bookingStatus)) {
                status = "completed";
            }

            responses.add(new CustomerBookingHistoryResponse(
                    ticketCode,
                    movieTitle,
                    roomName,
                    startTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy")),
                    seatsStr,
                    combosStr,
                    priceStr,
                    status
            ));
        }

        return responses;
    }


    @Transactional(readOnly = true)
    public List<AdminBookingListResponse> getAdminBookings(String keyword) {
        List<Object[]> rows = bookingRepository.loadAdminBookings(keyword);
        List<AdminBookingListResponse> responses = new ArrayList<>();

        for (Object[] row : rows) {
            UUID bookingUuid = toUuid(row[0]);
            String customerName = stringValue(row[1]);
            String customerEmail = stringValue(row[2]);
            String movieTitle = stringValue(row[3]);
            String roomName = stringValue(row[4]);
            BigDecimal totalPrice = toBigDecimal(row[5]);
            String status = stringValue(row[6]);
            OffsetDateTime createdAt = bookingRepository.toOffsetDateTime(row[7]);
            String customerAvatarUrl = stringValue(row[8]);

            // Load seats
            List<Object[]> seatsRows = bookingRepository.loadSeatsForBooking(bookingUuid);
            List<String> seatNames = new ArrayList<>();
            for (Object[] seatRow : seatsRows) {
                seatNames.add(stringValue(seatRow[0]) + seatRow[1]);
            }
            String seatsStr = String.join(", ", seatNames);

            // Load combos
            List<Object[]> comboRows = bookingRepository.loadCombosForBooking(bookingUuid);
            List<String> comboNames = new ArrayList<>();
            for (Object[] comboRow : comboRows) {
                comboNames.add(comboRow[1] + "x " + comboRow[0]);
            }
            String combosStr = comboNames.isEmpty() ? "" : String.join(", ", comboNames);

            responses.add(new AdminBookingListResponse(
                    bookingUuid,
                    customerName,
                    customerEmail,
                    movieTitle,
                    roomName,
                    seatsStr,
                    combosStr,
                    totalPrice,
                    status,
                    createdAt,
                    customerAvatarUrl
            ));
        }

        return responses;
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

    private String formatPrice(BigDecimal price) {
        if (price == null) {
            return "0đ";
        }
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols(new java.util.Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        java.text.DecimalFormat formatter = new java.text.DecimalFormat("#,###", symbols);
        return formatter.format(price) + "đ";
    }

    private record ResolvedCombo(UUID comboUuid, String name, Integer quantity, BigDecimal lineTotal) {
    }

    private record GapSeat(String rowName, Integer seatNumber, boolean unavailable, boolean selectedByUser) {
    }
}
