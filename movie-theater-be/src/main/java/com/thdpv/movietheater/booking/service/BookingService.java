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
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.dto.response.CustomerBookingHistoryResponse;
import com.thdpv.movietheater.booking.dto.response.PurchaseHistoryResponse;
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
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.enums.ScreeningMode;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.MovieStreamingUtils;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.booking.dto.request.ConfirmOnlineBookingRequest;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.notification.service.VodNotificationService;
import com.thdpv.movietheater.notification.service.TheaterNotificationService;
import com.thdpv.movietheater.payment.service.PaymentService;

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
    private final ShowtimeRepository showtimeRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final MovieRepository movieRepository;
    private final SystemConfigService systemConfigService;
    private final VodNotificationService vodNotificationService;
    private final TheaterNotificationService theaterNotificationService;
    private final VoucherRedemptionService voucherRedemptionService;
    private final SeatMapEventPublisher seatMapEventPublisher;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final CancellationRefundService cancellationRefundService;
    private final PaymentService paymentService;

    @Transactional
    public BookingResponse confirmOnlineBooking(String currentUserEmail, ConfirmOnlineBookingRequest request) {
        if (request.getMovieUuid() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "ID phim không được để trống");
        }
        Movie movie = movieRepository.findById(request.getMovieUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        if (movie.getScreeningMode() == ScreeningMode.THEATER_ONLY || movie.getScreeningMode() == ScreeningMode.NONE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phim không hỗ trợ xem trực tuyến");
        }

        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();

        Optional<Booking> existingOpt = bookingJpaRepository
                .findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                        userUuid, request.getMovieUuid(), "ONLINE", BOOKING_STATUS_CONFIRMED);
        if (existingOpt.isPresent()) {
            Booking existing = existingOpt.get();
            boolean stillValid = existing.getFirstPlayedAt() == null
                    || (existing.getExpiresAt() != null && !now.isAfter(existing.getExpiresAt()));
            if (stillValid) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Bạn vẫn còn vé xem online còn hiệu lực cho phim này. Vui lòng kích hoạt hoặc xem trước khi mua thêm.");
            }
        }

        BigDecimal basePrice = movie.getOnlinePrice() != null
                ? movie.getOnlinePrice()
                : systemConfigService.getDefaultOnlinePrice();
        BigDecimal discountAmount = BigDecimal.ZERO;
        UUID promotionUuid = null;
        Promotion resolvedPromotion = null;

        if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
            resolvedPromotion = promotionRepository.findByCodeIgnoreCaseForUpdate(request.getPromotionCode().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi không tồn tại"));

            if (!"ACTIVE".equalsIgnoreCase(resolvedPromotion.getStatus())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã hết hạn hoặc vô hiệu lực");
            }

            if (resolvedPromotion.getStartDate() != null && now.isBefore(resolvedPromotion.getStartDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi chưa bắt đầu");
            }

            if (resolvedPromotion.getEndDate() != null && now.isAfter(resolvedPromotion.getEndDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi đã kết thúc");
            }

            if (resolvedPromotion.getMaxUsage() != null && resolvedPromotion.getUsedCount() != null
                    && resolvedPromotion.getUsedCount() >= resolvedPromotion.getMaxUsage()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã đạt số lượt sử dụng tối đa");
            }

            if (Boolean.TRUE.equals(resolvedPromotion.getOncePerUser())) {
                boolean alreadyUsed = bookingJpaRepository.existsByUserUuidAndPromotionUuid(userUuid, resolvedPromotion.getId());
                if (alreadyUsed) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã sử dụng mã khuyến mãi này rồi");
                }
            }

            if (!resolvedPromotion.requiresPointRedemption()
                    && resolvedPromotion.getMaxUsagePerUser() != null) {
                long userUsageCount = bookingJpaRepository.countByUserUuidAndPromotionUuid(
                        userUuid, resolvedPromotion.getId());
                if (userUsageCount >= resolvedPromotion.getMaxUsagePerUser()) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã đạt giới hạn sử dụng voucher này");
                }
            }

            promotionUuid = resolvedPromotion.getId();
            if ("PERCENTAGE".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                discountAmount = basePrice.multiply(resolvedPromotion.getDiscountValue()).setScale(0, RoundingMode.HALF_UP);
            } else if ("FIXED_AMOUNT".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                discountAmount = resolvedPromotion.getDiscountValue();
            }
        }

        BigDecimal totalPrice = basePrice.subtract(discountAmount);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO;
        }

        UUID bookingUuid = UUID.randomUUID();
        paymentService.chargeBooking(bookingUuid, totalPrice, request.getPaymentMethod(), "pay-" + bookingUuid, userUuid);

        Booking booking = new Booking();
        booking.setUuid(bookingUuid);
        booking.setUserUuid(userUuid);
        booking.setShowtimeUuid(null);
        booking.setMovieUuid(movie.getUuid());
        booking.setBookingType("ONLINE");
        booking.setTotalPrice(totalPrice);
        booking.setStatus(BOOKING_STATUS_CONFIRMED);
        booking.setCreatedAt(now);
        booking.setUpdatedAt(now);
        booking.setConfirmedAt(now);
        booking.setCreatedBy(userUuid);
        booking.setUpdatedBy(userUuid);
        booking.setPromotionUuid(promotionUuid);

        bookingJpaRepository.save(booking);

        if (resolvedPromotion != null) {
            int currentUsed = resolvedPromotion.getUsedCount() != null ? resolvedPromotion.getUsedCount() : 0;
            resolvedPromotion.setUsedCount(currentUsed + 1);
            promotionRepository.save(resolvedPromotion);
            voucherRedemptionService.consumeActiveVoucher(userUuid, resolvedPromotion, bookingUuid, now);
        }

        int scoreAdded = calculateScore(totalPrice);
        if (scoreAdded > 0) {
            bookingRepository.addUserScore(userUuid, scoreAdded);
            bookingRepository.addLifetimeScore(userUuid, scoreAdded);
            bookingRepository.insertScoreHistory(userUuid, scoreAdded, bookingUuid, now);
        }

        try {
            vodNotificationService.sendVodTicketEmail(userUuid, bookingUuid, movie.getTitle(), movie.getUuid());
        } catch (Exception ex) {
            // Không chặn đặt vé nếu gửi email thất bại
        }

        realtimeEventPublisher.notifyOnlineBookingConfirmed(bookingUuid);

        return new BookingResponse(
                bookingUuid,
                null,
                BOOKING_STATUS_CONFIRMED,
                totalPrice,
                scoreAdded,
                now,
                List.of(),
                List.of(),
                List.of()
        );
    }

    @Transactional
    public BookingResponse confirmBooking(String currentUserEmail, ConfirmBookingRequest request) {
        bookingRepository.ensureShowtimeExists(request.getShowtimeUuid());
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

        // Calculate combo discount based on member loyalty points (VIP >= 10000 gets 15% off, FRIEND >= 5000 gets 10% off, < 5000 gets 0% off)
        Integer userScore = userRepository.findById(userUuid)
                .map(User::getScore)
                .orElse(0);
        BigDecimal comboDiscountRate;
        if (userScore >= 10000) {
            comboDiscountRate = BigDecimal.valueOf(0.85); // 15% discount
        } else if (userScore >= 5000) {
            comboDiscountRate = BigDecimal.valueOf(0.90); // 10% discount
        } else {
            comboDiscountRate = BigDecimal.valueOf(1.00); // 0% discount
        }

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
        Promotion resolvedPromotion = null;
        if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
            resolvedPromotion = promotionRepository.findByCodeIgnoreCaseForUpdate(request.getPromotionCode().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi không tồn tại"));

            if (!"ACTIVE".equalsIgnoreCase(resolvedPromotion.getStatus())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã hết hạn hoặc vô hiệu lực");
            }

            if (resolvedPromotion.getStartDate() != null && now.isBefore(resolvedPromotion.getStartDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi chưa bắt đầu");
            }

            if (resolvedPromotion.getEndDate() != null && now.isAfter(resolvedPromotion.getEndDate())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Chương trình khuyến mãi đã kết thúc");
            }

            if (resolvedPromotion.getMaxUsage() != null && resolvedPromotion.getUsedCount() != null
                    && resolvedPromotion.getUsedCount() >= resolvedPromotion.getMaxUsage()) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã khuyến mãi đã đạt số lượt sử dụng tối đa");
            }

            if (Boolean.TRUE.equals(resolvedPromotion.getOncePerUser())) {
                boolean alreadyUsed = bookingJpaRepository.existsByUserUuidAndPromotionUuid(userUuid, resolvedPromotion.getId());
                if (alreadyUsed) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã sử dụng mã khuyến mãi này rồi");
                }
            }

            if (!resolvedPromotion.requiresPointRedemption()
                    && resolvedPromotion.getMaxUsagePerUser() != null) {
                long userUsageCount = bookingJpaRepository.countByUserUuidAndPromotionUuid(
                        userUuid, resolvedPromotion.getId());
                if (userUsageCount >= resolvedPromotion.getMaxUsagePerUser()) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Bạn đã đạt giới hạn sử dụng voucher này");
                }
            }

            promotionUuid = resolvedPromotion.getId();
            if ("PERCENTAGE".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                // Percentage discount applies to ticket sum (seatTotal)
                discountAmount = seatTotal.multiply(resolvedPromotion.getDiscountValue()).setScale(0, RoundingMode.HALF_UP);
            } else if ("FIXED_AMOUNT".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                // Fixed amount discount applies directly
                discountAmount = resolvedPromotion.getDiscountValue();
            }
        }

        BigDecimal subtotal = seatTotal.add(comboTotal);
        BigDecimal totalPrice = subtotal.subtract(discountAmount);
        if (totalPrice.compareTo(BigDecimal.ZERO) < 0) {
            totalPrice = BigDecimal.ZERO;
        }

        UUID bookingUuid = UUID.randomUUID();
        paymentService.chargeBooking(bookingUuid, totalPrice, request.getPaymentMethod(), "pay-" + bookingUuid, userUuid);

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

        if (resolvedPromotion != null) {
            int currentUsed = resolvedPromotion.getUsedCount() != null ? resolvedPromotion.getUsedCount() : 0;
            resolvedPromotion.setUsedCount(currentUsed + 1);
            promotionRepository.save(resolvedPromotion);
            voucherRedemptionService.consumeActiveVoucher(userUuid, resolvedPromotion, bookingUuid, now);
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
            bookingRepository.addLifetimeScore(userUuid, scoreAdded);
            bookingRepository.insertScoreHistory(userUuid, scoreAdded, bookingUuid, now);
        }

        bookingRepository.deleteSeatLocks(request.getShowtimeUuid(), userUuid, seatUuids);

        // Auto sold out transition check
        try {
            Showtime showtime = showtimeRepository.findById(request.getShowtimeUuid()).orElse(null);
            if (showtime != null) {
                CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid()).orElse(null);
                if (room != null) {
                    long bookedSeats = bookingSeatRepository.countByShowtimeUuid(showtime.getUuid());
                    if (room.getCapacity() != null && room.getCapacity() > 0 && bookedSeats >= room.getCapacity()) {
                        showtime.setStatus(ShowtimeStatus.SOLD_OUT);
                        showtimeRepository.save(showtime);
                    }
                }
            }
        } catch (Exception e) {
            // Log warning but do not break booking flow
        }

        try {
            sendTheaterTicketEmailNotification(
                    userUuid,
                    bookingUuid,
                    request.getShowtimeUuid(),
                    seatLines,
                    comboLines,
                    ticketLines,
                    totalPrice);
        } catch (Exception ex) {
            // Không chặn đặt vé nếu gửi email thất bại
        }

        seatMapEventPublisher.notifySeatMapUpdated(request.getShowtimeUuid());
        realtimeEventPublisher.notifyBookingConfirmed(bookingUuid, request.getShowtimeUuid());

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
        Showtime showtime = showtimeRepository.findById(showtimeUuid)
                .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
        if (showtime.getStatus() != ShowtimeStatus.OPEN_FOR_BOOKING) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu khong o trang thai mo ban ve, khong the thuc hien");
        }
        if (showtime.getStartTime() != null && showtime.getStartTime().isBefore(now)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Suat chieu da bat dau hoac da dien ra, khong the thuc hien");
        }
    }

    private void autoSlideShowtimeIfPast(UUID showtimeUuid, OffsetDateTime now) {
        if (bookingRepository.hasConfirmedBookings(showtimeUuid)) {
            return;
        }
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
        int maxSeats = systemConfigService.getMaxSeatsPerBooking();
        if (normalized.size() > maxSeats) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Khong duoc chon qua " + maxSeats + " ghe cho moi lan dat");
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

    private void sendTheaterTicketEmailNotification(
            UUID userUuid,
            UUID bookingUuid,
            UUID showtimeUuid,
            List<BookingResponse.SeatLine> seatLines,
            List<BookingResponse.ComboLine> comboLines,
            List<BookingResponse.TicketLine> ticketLines,
            BigDecimal totalPrice) {
        Showtime showtime = showtimeRepository.findById(showtimeUuid).orElse(null);
        if (showtime == null) {
            return;
        }

        Movie movie = movieRepository.findById(showtime.getMovieUuid()).orElse(null);
        CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid()).orElse(null);

        String movieTitle = movie != null ? movie.getTitle() : "Phim";
        String cinemaName = room != null ? room.getName() : "";
        if (room != null && room.getCinema() != null && room.getCinema().getName() != null) {
            cinemaName = room.getCinema().getName() + " - " + room.getName();
        }

        String showtimeLabel = "";
        if (showtime.getStartTime() != null) {
            showtimeLabel = showtime.getStartTime()
                    .withOffsetSameInstant(ZoneOffset.ofHours(7))
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy"));
        }

        String seatsLabel = seatLines.stream()
                .map(seat -> seat.getRowName() + seat.getSeatNumber())
                .collect(Collectors.joining(", "));

        String combosLabel = comboLines.isEmpty()
                ? "Không kèm bắp nước"
                : comboLines.stream()
                        .map(combo -> combo.getQuantity() + "x " + combo.getName())
                        .collect(Collectors.joining(", "));

        String ticketCodes = ticketLines.stream()
                .map(BookingResponse.TicketLine::getTicketCode)
                .collect(Collectors.joining(", "));

        theaterNotificationService.sendTheaterTicketEmail(
                userUuid,
                bookingUuid,
                movieTitle,
                cinemaName,
                showtimeLabel,
                seatsLabel,
                combosLabel,
                formatPrice(totalPrice),
                ticketCodes);
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
            if (startTime != null) {
                startTime = startTime.withOffsetSameInstant(ZoneOffset.ofHours(7));
            }
            String movieTitle = stringValue(row[5]);
            String roomName = stringValue(row[6]);
            String seatsStr = stringValue(row[7]);
            String rawCombosStr = stringValue(row[8]);
            String ticketCode = stringValue(row[9]);
            String ticketStatus = stringValue(row[10]);
            UUID movieUuid = toUuid(row[11]);
            String bookingType = stringValue(row[12]);
            OffsetDateTime firstPlayedAt = bookingRepository.toOffsetDateTime(row[13]);
            OffsetDateTime expiresAt = bookingRepository.toOffsetDateTime(row[14]);
            if (firstPlayedAt != null) {
                firstPlayedAt = firstPlayedAt.withOffsetSameInstant(ZoneOffset.ofHours(7));
            }
            if (expiresAt != null) {
                expiresAt = expiresAt.withOffsetSameInstant(ZoneOffset.ofHours(7));
            }

            String combosStr = (rawCombosStr == null || rawCombosStr.isBlank()) ? "Không kèm bắp nước" : rawCombosStr;
            String priceStr = formatPrice(totalPrice);
            String cinemaLabel = roomName;
            boolean isOnline = isOnlineBookingType(bookingType, cinemaLabel);
            boolean vodActivated = isOnline && firstPlayedAt != null;
            OffsetDateTime now = OffsetDateTime.now();

            // active = còn dùng được; cancelled / used / expired = vé không còn hiệu lực
            String status;
            if (isCancelledBookingStatus(bookingStatus)) {
                status = "cancelled";
            } else if ("USED".equalsIgnoreCase(ticketStatus)) {
                status = "used";
            } else if (isOnline) {
                if (vodActivated && expiresAt != null && now.isAfter(expiresAt)) {
                    status = "expired";
                } else {
                    status = "active";
                }
            } else if (startTime != null && startTime.isAfter(now)) {
                status = "active";
            } else {
                status = "expired";
            }

            boolean cancellable = "CONFIRMED".equalsIgnoreCase(bookingStatus)
                    && "active".equals(status)
                    && (!isOnline || !vodActivated);

            responses.add(new CustomerBookingHistoryResponse(
                    bookingUuid,
                    ticketCode,
                    movieTitle,
                    roomName,
                    startTime != null
                            ? startTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy"))
                            : "",
                    seatsStr,
                    combosStr,
                    priceStr,
                    status,
                    movieUuid,
                    bookingType,
                    cancellable,
                    vodActivated,
                    bookingStatus
            ));
        }

        Set<UUID> movieUuids = responses.stream()
                .map(CustomerBookingHistoryResponse::getMovieUuid)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (!movieUuids.isEmpty()) {
            Map<UUID, String> posterByMovie = movieRepository.findAllByIdWithMedias(movieUuids).stream()
                    .collect(Collectors.toMap(Movie::getUuid, this::resolvePrimaryPosterUrl));
            for (CustomerBookingHistoryResponse response : responses) {
                if (response.getMovieUuid() != null) {
                    response.setMoviePosterUrl(posterByMovie.get(response.getMovieUuid()));
                }
            }
        }

        return responses;
    }

    private String resolvePrimaryPosterUrl(Movie movie) {
        if (movie == null || movie.getMovieMedias() == null) {
            return null;
        }
        for (MovieMedia movieMedia : movie.getMovieMedias()) {
            if (Boolean.TRUE.equals(movieMedia.getIsPrimary())) {
                return movieMedia.getMediaUrl();
            }
        }
        return movie.getMovieMedias().stream()
                .findFirst()
                .map(MovieMedia::getMediaUrl)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<PurchaseHistoryResponse> getPurchaseHistory(String email) {
        UUID userUuid = resolveRequiredUserUuid(email);
        List<Object[]> rows = bookingRepository.loadPurchaseHistory(userUuid);
        List<PurchaseHistoryResponse> responses = new ArrayList<>();

        for (Object[] row : rows) {
            UUID bookingUuid = toUuid(row[0]);
            String ticketCode = stringValue(row[1]);
            String movieTitle = stringValue(row[2]);
            String cinemaName = stringValue(row[3]);
            String roomName = stringValue(row[4]);
            OffsetDateTime showtimeRaw = bookingRepository.toOffsetDateTime(row[5]);
            if (showtimeRaw != null) {
                showtimeRaw = showtimeRaw.withOffsetSameInstant(ZoneOffset.ofHours(7));
            }
            String seatsStr = stringValue(row[6]);
            String combosStr = stringValue(row[7]);
            BigDecimal totalPrice = toBigDecimal(row[8]);
            String bookingStatus = stringValue(row[9]);
            String bookingType = stringValue(row[10]);
            String promotionCode = stringValue(row[11]);
            String promotionDiscountType = stringValue(row[12]);
            BigDecimal promotionDiscountValue = promotionCode == null ? null : toBigDecimal(row[13]);
            OffsetDateTime createdAt = bookingRepository.toOffsetDateTime(row[14]);
            if (createdAt != null) {
                createdAt = createdAt.withOffsetSameInstant(ZoneOffset.ofHours(7));
            }
            UUID movieUuid = toUuid(row[15]);

            PurchaseHistoryResponse item = new PurchaseHistoryResponse();
            item.setBookingUuid(bookingUuid);
            item.setTicketCode(ticketCode);
            item.setMovieTitle(movieTitle);
            item.setMovieUuid(movieUuid);
            item.setCinemaName(cinemaName);
            item.setRoomName(roomName);
            item.setShowtime(showtimeRaw != null
                    ? showtimeRaw.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy"))
                    : "");
            item.setSeats(seatsStr);
            item.setCombo(combosStr);
            item.setTotalPrice(formatPrice(totalPrice));
            item.setBookingStatus(bookingStatus);
            item.setBookingType(bookingType);
            item.setPromotionCode(promotionCode);
            item.setPromotionDescription(formatPromotionDescription(promotionDiscountType, promotionDiscountValue));
            paymentService.findLatestPayment(bookingUuid).ifPresentOrElse(payment -> {
                item.setPaymentMethod(formatPaymentMethodLabel(payment.getMethod()));
                item.setPaymentStatus(payment.getStatus());
            }, () -> item.setPaymentMethod("Ví NASA"));
            item.setPurchasedAt(createdAt != null
                    ? createdAt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy"))
                    : "");
            responses.add(item);
        }

        return responses;
    }

    private String formatPaymentMethodLabel(String method) {
        if (method == null || method.isBlank()) {
            return "Ví NASA";
        }
        return switch (method.toUpperCase()) {
            case "MOCK" -> "Thanh toán mô phỏng";
            case "WALLET" -> "Ví NASA";
            case "CARD" -> "Thẻ ngân hàng";
            case "MOMO" -> "Ví MoMo";
            case "VNPAY" -> "VNPay";
            case "CASH" -> "Tiền mặt";
            default -> method;
        };
    }

    private String formatPromotionDescription(String discountType, BigDecimal discountValue) {
        if (discountType == null || discountValue == null) {
            return null;
        }
        if ("PERCENTAGE".equalsIgnoreCase(discountType)) {
            return "Giảm " + discountValue.stripTrailingZeros().toPlainString() + "%";
        }
        return "Giảm " + formatPrice(discountValue);
    }


    @Transactional(readOnly = true)
    public List<AdminBookingListResponse> getAdminBookings(String keyword) {
        return getAdminBookings(keyword, null, null);
    }

    @Transactional(readOnly = true)
    public List<AdminBookingListResponse> getAdminBookings(String keyword, Integer page, Integer size) {
        Integer offset = null;
        Integer limit = null;
        if (page != null && size != null) {
            offset = page * size;
            limit = size;
        }

        List<Object[]> rows = bookingRepository.loadAdminBookings(keyword, offset, limit);
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
            String seatsStr = stringValue(row[9]);
            String combosStr = stringValue(row[10]);

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

    private boolean isCancelledBookingStatus(String bookingStatus) {
        if (bookingStatus == null) {
            return false;
        }
        String normalized = bookingStatus.toUpperCase();
        return "CANCELLED".equals(normalized)
                || "REFUNDED".equals(normalized)
                || "REFUND_PENDING".equals(normalized)
                || "REFUND_PROCESSING".equals(normalized)
                || "CANCELLING".equals(normalized);
    }

    private boolean isOnlineBookingType(String bookingType, String cinemaLabel) {
        if ("ONLINE".equalsIgnoreCase(bookingType)) {
            return true;
        }
        if (cinemaLabel == null || cinemaLabel.isBlank()) {
            return false;
        }
        String label = cinemaLabel.toUpperCase();
        return label.contains("VOD") || label.contains("XEM ONLINE") || label.contains("TRỰC TUYẾN");
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

    @Transactional
    public void checkInTicket(String ticketCode) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã vé không hợp lệ");
        }
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy vé"));

        if (!TICKET_STATUS_ISSUED.equalsIgnoreCase(ticket.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Vé đã được soát hoặc đã bị hủy");
        }

        ticket.setStatus("USED");
        ticket.setCheckedInAt(OffsetDateTime.now());
        ticketRepository.save(ticket);

        Booking booking = bookingJpaRepository.findById(ticket.getBookingUuid()).orElse(null);
        UUID showtimeUuid = booking != null ? booking.getShowtimeUuid() : null;
        realtimeEventPublisher.notifyTicketCheckedIn(ticket.getBookingUuid(), showtimeUuid, ticketCode.trim());
    }

    @Transactional
    public void cancelBooking(UUID bookingUuid, String email) {
        UUID actorUuid = email != null && !email.isBlank() ? resolveRequiredUserUuid(email) : null;
        cancellationRefundService.cancelBooking(bookingUuid, actorUuid, "CUSTOMER", false, null, false);
    }

    private record ResolvedCombo(UUID comboUuid, String name, Integer quantity, BigDecimal lineTotal) {
    }

    private record GapSeat(String rowName, Integer seatNumber, boolean unavailable, boolean selectedByUser) {
    }

    @Transactional(readOnly = true)
    public VodStatusResponse getVodStatus(String currentUserEmail, UUID movieUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        Optional<Booking> optBooking = bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED);

        if (optBooking.isEmpty()) {
            return new VodStatusResponse(false, "NONE", null, null, null);
        }

        Booking booking = optBooking.get();
        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        OffsetDateTime now = OffsetDateTime.now();
        String playbackState = "WAITING_FOR_PLAY";
        String streamingUrl = null;

        if (booking.getFirstPlayedAt() != null) {
            if (now.isAfter(booking.getExpiresAt())) {
                playbackState = "EXPIRED";
            } else {
                playbackState = "STREAMING";
                streamingUrl = MovieStreamingUtils.resolveStreamingUrl(movie);
            }
        }

        return new VodStatusResponse(
                true,
                playbackState,
                booking.getFirstPlayedAt(),
                booking.getExpiresAt(),
                streamingUrl);
    }

    @Transactional
    public void resendVodTicketEmail(String currentUserEmail, UUID movieUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        Booking booking = bookingJpaRepository
                .findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                        userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy vé online cho phim này"));

        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        OffsetDateTime now = OffsetDateTime.now();
        if (booking.getFirstPlayedAt() != null
                && booking.getExpiresAt() != null
                && now.isAfter(booking.getExpiresAt())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
        }

        vodNotificationService.sendVodTicketEmail(userUuid, booking.getUuid(), movie.getTitle(), movie.getUuid());
    }

    @Transactional
    public VodPlayResponse activateVodPlay(String currentUserEmail, UUID movieUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        Booking booking = bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Bạn chưa mua vé xem trực tuyến phim này"));

        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        String streamingUrl = MovieStreamingUtils.resolveStreamingUrl(movie);
        if (streamingUrl == null || streamingUrl.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Phim chưa được cấu hình link phát trực tuyến. Vui lòng liên hệ quản trị viên.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        String streamToken = UUID.randomUUID().toString();

        if (booking.getFirstPlayedAt() != null) {
            if (now.isAfter(booking.getExpiresAt())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
            }
            // Re-entry: generate new streamToken to kick out other sessions
            booking.setStreamToken(streamToken);
            bookingJpaRepository.save(booking);
            return new VodPlayResponse(streamToken, streamingUrl, booking.getExpiresAt());
        }

        // First play activation
        int durationMinutes = movie.getDurationMinutes() != null ? movie.getDurationMinutes() : 120;
        double lockMultiplier = systemConfigService.getOnlineWatchLockMultiplier();
        OffsetDateTime firstPlayedAt = now;
        OffsetDateTime expiresAt = firstPlayedAt.plusMinutes(Math.round(durationMinutes * lockMultiplier));

        booking.setFirstPlayedAt(firstPlayedAt);
        booking.setExpiresAt(expiresAt);
        booking.setStreamToken(streamToken);
        bookingJpaRepository.save(booking);

        return new VodPlayResponse(streamToken, streamingUrl, expiresAt);
    }

    @Transactional(readOnly = true)
    public void vodHeartbeat(String currentUserEmail, UUID movieUuid, String streamToken) {
        if (streamToken == null || streamToken.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Token phát trực tuyến không hợp lệ");
        }
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        Booking booking = bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy vé xem trực tuyến hoạt động"));

        if (booking.getFirstPlayedAt() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phim chưa được kích hoạt phát");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (now.isAfter(booking.getExpiresAt())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
        }

        if (!streamToken.equals(booking.getStreamToken())) {
            // Kick-out: conflict (409)
            throw new AppException(ErrorCode.CONFLICT, "Tài khoản đang được xem trên thiết bị khác");
        }
    }
}
