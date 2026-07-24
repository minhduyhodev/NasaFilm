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

import com.thdpv.movietheater.booking.dto.CounterBookingConfirmRequest;
import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.dto.response.CheckInTicketResponse;
import com.thdpv.movietheater.booking.dto.response.CustomerBookingHistoryResponse;
import com.thdpv.movietheater.booking.dto.response.PurchaseHistoryResponse;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.BookingCombo;
import com.thdpv.movietheater.booking.entity.BookingSeat;
import com.thdpv.movietheater.booking.entity.Ticket;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.ComboPrice;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.LockedSeat;
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
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.enums.ScreeningMode;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;
import com.thdpv.movietheater.movie.util.StreamTokenUtils;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.booking.dto.request.ConfirmOnlineBookingRequest;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.notification.dto.TheaterTicketQrItem;
import com.thdpv.movietheater.notification.service.TheaterNotificationService;
import com.thdpv.movietheater.notification.service.VodNotificationService;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;
import com.thdpv.movietheater.payment.repository.VietQRWebhookTransactionRepository;
import com.thdpv.movietheater.payment.service.PaymentService;
import com.thdpv.movietheater.mission.dto.MissionEventPayload;
import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.service.OrbitRoomService;


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
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final VietQRWebhookTransactionRepository vietQRWebhookTransactionRepository;
    private final ShowtimeCapacityService showtimeCapacityService;
    private final MissionService missionService;
    private final OrbitRoomService orbitRoomService;
    private final SeatGapValidationService seatGapValidationService;
    private final ShowtimeOverlapSupport showtimeOverlapSupport;

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

        // Serialize concurrent double-submits for the same user: a second request blocks here until the
        // first commits, then sees the just-created booking below and is rejected — preventing double-charge.
        userRepository.findByIdForUpdate(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy người dùng"));

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
            supersedeOnlineBookings(userUuid, request.getMovieUuid(), now);
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

        reconcileExternalVietQRPayment(userUuid, bookingUuid, totalPrice, request.getPaymentMethod(),
                request.getPaymentIntentId());

        // Charge after booking rows exist so a seat/DB failure cannot leave a paid orphan charge
        paymentService.chargeBooking(bookingUuid, totalPrice, request.getPaymentMethod(), "pay-" + bookingUuid, userUuid);

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

        List<MissionCompletionResponse> missionCompletions = missionService.handleEvent(
                MissionEventPayload.vodPurchase(userUuid, bookingUuid, movie.getUuid(), now));

        BookingResponse response = new BookingResponse(
                bookingUuid,
                null,
                BOOKING_STATUS_CONFIRMED,
                totalPrice,
                scoreAdded,
                now,
                List.of(),
                List.of(),
                List.of());
        response.setMissionCompletions(missionCompletions);
        return response;
    }

    @Transactional
    public BookingResponse confirmBooking(String currentUserEmail, ConfirmBookingRequest request) {
        bookingRepository.ensureShowtimeExists(request.getShowtimeUuid());
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> seatUuids = normalizeSeatUuids(request.getSeatUuids());
        Map<UUID, Integer> comboQuantities = normalizeCombos(request.getCombos());
        UUID orbitRoomUuid = request.getOrbitRoomUuid();
        boolean isOrbitCheckout = orbitRoomUuid != null;

        if (autoSlideEnabled) {
            autoSlideShowtimeIfPast(request.getShowtimeUuid(), now);
        }
        assertShowtimeValidForBooking(request.getShowtimeUuid(), now);
        if (isOrbitCheckout) {
            orbitRoomService.assertCheckoutReady(orbitRoomUuid, userUuid, request.getShowtimeUuid(), seatUuids);
            // The host's request carries only the host's own combos; members' combos are read authoritatively
            // from the room server-side so they can't be silently dropped or tampered by the client. Aggregate
            // by comboUuid (host + members) into one map — required by the (booking_uuid, combo_uuid) unique key.
            Map<UUID, Integer> memberCombos = orbitRoomService.collectNonHostMemberComboQuantities(orbitRoomUuid);
            if (!memberCombos.isEmpty()) {
                Map<UUID, Integer> mergedCombos = new LinkedHashMap<>(comboQuantities);
                memberCombos.forEach((comboUuid, quantity) -> mergedCombos.merge(comboUuid, quantity, Integer::sum));
                comboQuantities = mergedCombos;
            }
        }
        showtimeCapacityService.validateCapacity(request.getShowtimeUuid(), seatUuids.size(), userUuid, now);
        bookingRepository.cleanupExpiredLocks(request.getShowtimeUuid(), now);

        List<LockedSeat> lockedSeats = bookingRepository.lockActiveSeatsForConfirm(
                request.getShowtimeUuid(), userUuid, seatUuids, now);
        if (lockedSeats.size() != seatUuids.size()) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe chua duoc giu hoac da het han giu ghe");
        }

        ensureNoBookedSeats(request.getShowtimeUuid(), seatUuids);
        seatGapValidationService.validateNoSingleSeatGap(request.getShowtimeUuid(), seatUuids, now);

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
            List<BookingSeat> bookingSeats = new ArrayList<>();
            List<Ticket> tickets = new ArrayList<>();
            for (LockedSeat seat : lockedSeats) {
                UUID bookingSeatUuid = UUID.randomUUID();
                bookingSeats.add(new BookingSeat(
                        bookingSeatUuid, bookingUuid, request.getShowtimeUuid(), seat.seatUuid(), seat.price()));
                seatLines.add(new BookingResponse.SeatLine(
                        seat.seatUuid(), seat.rowName(), seat.seatNumber(), seat.price()));

                UUID ticketUuid = UUID.randomUUID();
                String ticketCode = generateTicketCode();
                String qrCode = ticketCode;
                tickets.add(new Ticket(
                        ticketUuid, bookingUuid, bookingSeatUuid, ticketCode, qrCode, TICKET_STATUS_ISSUED, now));
                ticketLines.add(new BookingResponse.TicketLine(ticketUuid, bookingSeatUuid, ticketCode, qrCode));
            }
            bookingSeatRepository.saveAll(bookingSeats);
            ticketRepository.saveAll(tickets);
        } catch (DataIntegrityViolationException | PersistenceException ex) {
            throw new AppException(ErrorCode.CONFLICT, "Co ghe da duoc dat boi giao dich khac");
        }

        List<BookingResponse.ComboLine> comboLines = new ArrayList<>();
        List<BookingCombo> bookingCombos = new ArrayList<>();
        for (ResolvedCombo combo : discountedResolvedCombos) {
            bookingCombos.add(new BookingCombo(
                    UUID.randomUUID(), bookingUuid, combo.comboUuid(), combo.quantity(), combo.lineTotal()));
            comboLines.add(new BookingResponse.ComboLine(
                    combo.comboUuid(), combo.name(), combo.quantity(), combo.lineTotal()));
        }
        if (!bookingCombos.isEmpty()) {
            bookingComboRepository.saveAll(bookingCombos);
        }

        // Charge after seats/tickets persist; same @Transactional rolls back booking if charge fails
        reconcileExternalCardPayment(userUuid, bookingUuid, totalPrice, request.getPaymentMethod(),
                request.getPaymentIntentId());
        reconcileExternalVietQRPayment(userUuid, bookingUuid, totalPrice, request.getPaymentMethod(),
                request.getPaymentIntentId());
        paymentService.chargeBooking(bookingUuid, totalPrice, request.getPaymentMethod(), "pay-" + bookingUuid, userUuid);

        int scoreAdded;
        if (isOrbitCheckout) {
            scoreAdded = 0;
        } else {
            scoreAdded = calculateScore(totalPrice);
            if (scoreAdded > 0) {
                bookingRepository.addUserScore(userUuid, scoreAdded);
                bookingRepository.addLifetimeScore(userUuid, scoreAdded);
                bookingRepository.insertScoreHistory(userUuid, scoreAdded, bookingUuid, now);
            }
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
            if (isOrbitCheckout && orbitRoomUuid != null) {
                sendOrbitMemberTicketEmails(
                        orbitRoomUuid,
                        userUuid,
                        bookingUuid,
                        request.getShowtimeUuid(),
                        seatLines,
                        ticketLines);
            }
        } catch (Exception ex) {
            // Không chặn đặt vé nếu gửi email thất bại
        }

        seatMapEventPublisher.notifySeatMapUpdated(request.getShowtimeUuid());
        realtimeEventPublisher.notifyBookingConfirmed(bookingUuid, request.getShowtimeUuid());

        Showtime bookedShowtime = showtimeRepository.findById(request.getShowtimeUuid()).orElse(null);
        UUID movieUuid = bookedShowtime != null ? bookedShowtime.getMovieUuid() : null;
        List<MissionCompletionResponse> missionCompletions = new ArrayList<>();
        if (isOrbitCheckout) {
            var orbitResult = orbitRoomService.completeAfterBooking(
                    orbitRoomUuid, bookingUuid, movieUuid, userUuid, lockedSeats, now);
            scoreAdded = orbitResult.hostScoreAdded();
            missionCompletions.addAll(orbitResult.missionCompletions());
        } else {
            if (movieUuid != null) {
                missionCompletions.addAll(missionService.handleEvent(
                        MissionEventPayload.theaterBooking(userUuid, bookingUuid, movieUuid, now)));
            }
            missionCompletions.addAll(
                    missionService.tryOrbitFromGroupBooking(userUuid, bookingUuid, lockedSeats.size(), now));
        }

        BookingResponse response = new BookingResponse(
                bookingUuid,
                request.getShowtimeUuid(),
                BOOKING_STATUS_CONFIRMED,
                totalPrice,
                scoreAdded,
                now,
                seatLines,
                comboLines,
                ticketLines);
        response.setMissionCompletions(missionCompletions);
        return response;
    }

    @Transactional
    public BookingResponse confirmCounterBooking(String staffEmail, CounterBookingConfirmRequest request) {
        UUID staffUuid = resolveRequiredUserUuid(staffEmail);
        User customer = userRepository.findById(request.getCustomerUuid())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        UUID customerUuid = customer.getId();
        boolean isSystemAccount = Boolean.TRUE.equals(customer.getIsSystemAccount());
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> seatUuids = normalizeSeatUuids(request.getSeatUuids());
        Map<UUID, Integer> comboQuantities = normalizeCombos(request.getCombos());

        if (!isCounterPaymentMethod(request.getPaymentMethod())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phương thức thanh toán tại quầy không hợp lệ");
        }
        if (isSystemAccount && request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Khách vãng lai không được áp voucher");
        }

        if (autoSlideEnabled) {
            autoSlideShowtimeIfPast(request.getShowtimeUuid(), now);
        }
        assertShowtimeValidForBooking(request.getShowtimeUuid(), now);
        showtimeCapacityService.validateCapacity(request.getShowtimeUuid(), seatUuids.size(), staffUuid, now);
        bookingRepository.cleanupExpiredLocks(request.getShowtimeUuid(), now);

        List<LockedSeat> lockedSeats = bookingRepository.lockActiveSeatsForConfirm(
                request.getShowtimeUuid(), staffUuid, seatUuids, now);
        if (lockedSeats.size() != seatUuids.size()) {
            throw new AppException(ErrorCode.CONFLICT, "Có ghế chưa được giữ hoặc đã hết hạn giữ ghế");
        }

        ensureNoBookedSeats(request.getShowtimeUuid(), seatUuids);
        seatGapValidationService.validateNoSingleSeatGap(request.getShowtimeUuid(), seatUuids, now);

        List<ResolvedCombo> combos = resolveCombos(comboQuantities);
        BigDecimal seatTotal = lockedSeats.stream()
                .map(LockedSeat::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Integer userScore = customer.getScore() != null ? customer.getScore() : 0;
        BigDecimal comboDiscountRate;
        if (userScore >= 10000) {
            comboDiscountRate = BigDecimal.valueOf(0.85);
        } else if (userScore >= 5000) {
            comboDiscountRate = BigDecimal.valueOf(0.90);
        } else {
            comboDiscountRate = BigDecimal.valueOf(1.00);
        }

        BigDecimal comboTotal = BigDecimal.ZERO;
        List<ResolvedCombo> discountedResolvedCombos = new ArrayList<>();
        for (ResolvedCombo combo : combos) {
            BigDecimal discountedLineTotal = combo.lineTotal().multiply(comboDiscountRate).setScale(0, RoundingMode.HALF_UP);
            comboTotal = comboTotal.add(discountedLineTotal);
            discountedResolvedCombos.add(new ResolvedCombo(combo.comboUuid(), combo.name(), combo.quantity(), discountedLineTotal));
        }

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
                boolean alreadyUsed = bookingJpaRepository.existsByUserUuidAndPromotionUuid(customerUuid, resolvedPromotion.getId());
                if (alreadyUsed) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Khách hàng đã sử dụng mã khuyến mãi này rồi");
                }
            }
            if (!resolvedPromotion.requiresPointRedemption()
                    && resolvedPromotion.getMaxUsagePerUser() != null) {
                long userUsageCount = bookingJpaRepository.countByUserUuidAndPromotionUuid(
                        customerUuid, resolvedPromotion.getId());
                if (userUsageCount >= resolvedPromotion.getMaxUsagePerUser()) {
                    throw new AppException(ErrorCode.BAD_REQUEST, "Khách hàng đã đạt giới hạn sử dụng voucher này");
                }
            }

            promotionUuid = resolvedPromotion.getId();
            if ("PERCENTAGE".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                discountAmount = seatTotal.multiply(resolvedPromotion.getDiscountValue()).setScale(0, RoundingMode.HALF_UP);
            } else if ("FIXED_AMOUNT".equalsIgnoreCase(resolvedPromotion.getDiscountType())) {
                discountAmount = resolvedPromotion.getDiscountValue();
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
                customerUuid,
                request.getShowtimeUuid(),
                totalPrice,
                BOOKING_STATUS_CONFIRMED,
                now,
                now,
                now,
                customerUuid,
                staffUuid);
        booking.setStaffUuid(staffUuid);
        booking.setPromotionUuid(promotionUuid);
        bookingJpaRepository.save(booking);

        if (resolvedPromotion != null) {
            int currentUsed = resolvedPromotion.getUsedCount() != null ? resolvedPromotion.getUsedCount() : 0;
            resolvedPromotion.setUsedCount(currentUsed + 1);
            promotionRepository.save(resolvedPromotion);
            voucherRedemptionService.consumeActiveVoucher(customerUuid, resolvedPromotion, bookingUuid, now);
        }

        List<BookingResponse.SeatLine> seatLines = new ArrayList<>();
        List<BookingResponse.TicketLine> ticketLines = new ArrayList<>();
        try {
            List<BookingSeat> bookingSeats = new ArrayList<>();
            List<Ticket> tickets = new ArrayList<>();
            for (LockedSeat seat : lockedSeats) {
                UUID bookingSeatUuid = UUID.randomUUID();
                bookingSeats.add(new BookingSeat(
                        bookingSeatUuid, bookingUuid, request.getShowtimeUuid(), seat.seatUuid(), seat.price()));
                seatLines.add(new BookingResponse.SeatLine(
                        seat.seatUuid(), seat.rowName(), seat.seatNumber(), seat.price()));

                UUID ticketUuid = UUID.randomUUID();
                String ticketCode = generateTicketCode();
                String qrCode = ticketCode;
                tickets.add(new Ticket(
                        ticketUuid, bookingUuid, bookingSeatUuid, ticketCode, qrCode, TICKET_STATUS_ISSUED, now));
                ticketLines.add(new BookingResponse.TicketLine(ticketUuid, bookingSeatUuid, ticketCode, qrCode));
            }
            bookingSeatRepository.saveAll(bookingSeats);
            ticketRepository.saveAll(tickets);
        } catch (DataIntegrityViolationException | PersistenceException ex) {
            throw new AppException(ErrorCode.CONFLICT, "Có ghế đã được đặt bởi giao dịch khác");
        }

        List<BookingResponse.ComboLine> comboLines = new ArrayList<>();
        List<BookingCombo> bookingCombos = new ArrayList<>();
        for (ResolvedCombo combo : discountedResolvedCombos) {
            bookingCombos.add(new BookingCombo(
                    UUID.randomUUID(), bookingUuid, combo.comboUuid(), combo.quantity(), combo.lineTotal()));
            comboLines.add(new BookingResponse.ComboLine(
                    combo.comboUuid(), combo.name(), combo.quantity(), combo.lineTotal()));
        }
        if (!bookingCombos.isEmpty()) {
            bookingComboRepository.saveAll(bookingCombos);
        }

        paymentService.chargeBooking(
                bookingUuid,
                totalPrice,
                request.getPaymentMethod(),
                "counter-pay-" + bookingUuid,
                customerUuid);

        int scoreAdded = isSystemAccount ? 0 : calculateScore(totalPrice);
        if (scoreAdded > 0) {
            bookingRepository.addUserScore(customerUuid, scoreAdded);
            bookingRepository.addLifetimeScore(customerUuid, scoreAdded);
            bookingRepository.insertScoreHistory(customerUuid, scoreAdded, bookingUuid, now);
        }

        bookingRepository.deleteSeatLocks(request.getShowtimeUuid(), staffUuid, seatUuids);

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

        if (!isSystemAccount) {
            try {
                sendTheaterTicketEmailNotification(
                        customerUuid,
                        bookingUuid,
                        request.getShowtimeUuid(),
                        seatLines,
                        comboLines,
                        ticketLines,
                        totalPrice);
            } catch (Exception ex) {
                // Không chặn đặt vé nếu gửi email thất bại
            }
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

    private boolean isCounterPaymentMethod(String paymentMethod) {
        if (paymentMethod == null) {
            return false;
        }
        String normalized = paymentMethod.toUpperCase();
        return "COUNTER_CASH".equals(normalized)
                || "COUNTER_CARD".equals(normalized)
                || "COUNTER_VIETQR".equals(normalized);
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
        CinemaRoom room = cinemaRoomRepository.findById(showtime.getCinemaRoomUuid()).orElse(null);
        if (room != null && room.getStatus() != CinemaRoomStatus.ACTIVE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phong chieu khong o trang thai hoat dong");
        }
    }

    private void supersedeOnlineBookings(UUID userUuid, UUID movieUuid, OffsetDateTime now) {
        List<Booking> priorBookings = bookingJpaRepository.findByUserUuidAndMovieUuidAndBookingTypeAndStatus(
                userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED);
        for (Booking prior : priorBookings) {
            prior.setStatus("CANCELLED");
            prior.setUpdatedAt(now);
        }
        if (!priorBookings.isEmpty()) {
            bookingJpaRepository.saveAll(priorBookings);
        }
    }

    private void autoSlideShowtimeIfPast(UUID showtimeUuid, OffsetDateTime now) {
        if (bookingRepository.hasConfirmedBookings(showtimeUuid)) {
            return;
        }
        Showtime showtime = showtimeRepository.findById(showtimeUuid).orElse(null);
        showtimeOverlapSupport.planSlideIfPast(showtime, now).ifPresent(plan ->
                bookingRepository.slideShowtime(showtimeUuid, plan.newStart(), plan.daysToAdd()));
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

    /**
     * Interim guard against the "pay-what-you-want" card exploit. The server-side card charge currently goes
     * through the mock gateway (always succeeds), while the real money is a client-chosen Stripe amount — so a
     * client could pay 1đ and still get full-price tickets. Until the full webhook-driven confirmation flow
     * lands, a real card booking must be backed by a Stripe {@link PaymentTransaction} that (a) belongs to this
     * user, (b) is for a booking, (c) has succeeded (webhook-confirmed), and (d) covers the order total, and
     * each transaction can back only one booking. Enforced only when a real gateway is configured; mock/demo
     * runs keep their existing behavior so local testing is not blocked.
     */
    private void reconcileExternalCardPayment(UUID userUuid, UUID bookingUuid, BigDecimal totalPrice,
            String paymentMethod, String paymentIntentId) {
        if (!"card".equalsIgnoreCase(paymentMethod)) {
            return;
        }
        if (paymentService.isMockProvider()) {
            return;
        }
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Thiếu mã thanh toán thẻ.");
        }
        String intentId = paymentIntentId.trim();
        PaymentTransaction tx = paymentTransactionRepository.findByGatewayTransactionId(intentId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Không tìm thấy giao dịch thanh toán."));
        if (tx.getUserUuid() == null || !tx.getUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Giao dịch thanh toán không thuộc về bạn.");
        }
        if (tx.getPurpose() != null && !"BOOKING".equalsIgnoreCase(tx.getPurpose())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Giao dịch thanh toán không hợp lệ cho đặt vé.");
        }
        if (!"SUCCESS".equalsIgnoreCase(tx.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Chưa nhận được xác nhận thanh toán. Vui lòng thử lại sau giây lát.");
        }
        if (tx.getAmount() == null || tx.getAmount().compareTo(totalPrice) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền đã thanh toán không đủ cho đơn đặt vé.");
        }
        if (tx.getBookingUuid() != null && !tx.getBookingUuid().equals(bookingUuid)) {
            throw new AppException(ErrorCode.CONFLICT, "Giao dịch thanh toán đã được dùng cho đơn khác.");
        }
        int claimed = paymentTransactionRepository.claimSucceededForBooking(intentId, bookingUuid, OffsetDateTime.now());
        if (claimed == 0 && !bookingUuid.equals(tx.getBookingUuid())) {
            throw new AppException(ErrorCode.CONFLICT, "Giao dịch thanh toán đã được sử dụng.");
        }
    }

    private void reconcileExternalVietQRPayment(UUID userUuid, UUID bookingUuid, BigDecimal totalPrice,
            String paymentMethod, String paymentIntentId) {
        if (!"vietqr".equalsIgnoreCase(paymentMethod)) {
            return;
        }
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Thiếu mã chuyển khoản VietQR.");
        }
        String transferCode = paymentIntentId.trim();

        // Query database for unused VietQR transaction matching code and amount
        List<VietQRWebhookTransaction> txs = vietQRWebhookTransactionRepository.findMatchingUnusedTransaction(transferCode, totalPrice);
        if (txs.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Hệ thống chưa ghi nhận được chuyển khoản hoặc số tiền chuyển khoản không khớp. Vui lòng chờ 1-2 phút hoặc bấm kiểm tra lại.");
        }

        // Atomically claim one unused transfer for this booking so two concurrent bookings can't share a single
        // transfer (each candidate is claimed via a conditional UPDATE that only succeeds while it is still UNUSED).
        boolean claimed = false;
        for (VietQRWebhookTransaction candidate : txs) {
            if (vietQRWebhookTransactionRepository.claimForBooking(candidate.getId(), bookingUuid) == 1) {
                claimed = true;
                break;
            }
        }
        if (!claimed) {
            throw new AppException(ErrorCode.CONFLICT,
                    "Chuyển khoản VietQR này đã được sử dụng cho đơn khác. Vui lòng kiểm tra lại.");
        }
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

    private static final String TICKET_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TICKET_CODE_RANDOM_LENGTH = 10;
    private static final int TICKET_CODE_MAX_ATTEMPTS = 5;

    /**
     * Short, human-friendly ticket code: "TK" + 10 random uppercase alphanumeric chars (ambiguous
     * characters like 0/O/1/I/L excluded). Retries a few times on the rare collision with the
     * DB-level unique constraint before giving up, so callers still fail loudly instead of silently
     * saving a duplicate.
     */
    private String generateTicketCode() {
        for (int attempt = 0; attempt < TICKET_CODE_MAX_ATTEMPTS; attempt++) {
            String candidate = "TK" + randomTicketSuffix();
            if (!ticketRepository.existsByTicketCode(candidate)) {
                return candidate;
            }
        }
        throw new AppException(ErrorCode.CONFLICT, "Không thể tạo mã vé, vui lòng thử lại");
    }

    private String randomTicketSuffix() {
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(TICKET_CODE_RANDOM_LENGTH);
        for (int i = 0; i < TICKET_CODE_RANDOM_LENGTH; i++) {
            sb.append(TICKET_CODE_ALPHABET.charAt(random.nextInt(TICKET_CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private void sendOrbitMemberTicketEmails(
            UUID orbitRoomUuid,
            UUID hostUserUuid,
            UUID bookingUuid,
            UUID showtimeUuid,
            List<BookingResponse.SeatLine> seatLines,
            List<BookingResponse.TicketLine> ticketLines) {
        Map<UUID, Integer> seatIndexByUuid = new LinkedHashMap<>();
        for (int i = 0; i < seatLines.size(); i++) {
            seatIndexByUuid.put(seatLines.get(i).getSeatUuid(), i);
        }

        for (com.thdpv.movietheater.orbit.entity.OrbitMember member : orbitRoomService.listMembers(orbitRoomUuid)) {
            if (member.getUserUuid() == null || member.getUserUuid().equals(hostUserUuid)) {
                continue;
            }
            List<UUID> memberSeatUuids = com.thdpv.movietheater.orbit.util.OrbitSeatJson
                    .readSeatUuids(member.getSeatUuidsJson());
            if (memberSeatUuids.isEmpty()) {
                continue;
            }

            List<BookingResponse.SeatLine> memberSeats = new ArrayList<>();
            List<BookingResponse.TicketLine> memberTickets = new ArrayList<>();
            BigDecimal memberTotal = BigDecimal.ZERO;
            for (UUID seatUuid : memberSeatUuids) {
                Integer idx = seatIndexByUuid.get(seatUuid);
                if (idx == null) {
                    continue;
                }
                BookingResponse.SeatLine seatLine = seatLines.get(idx);
                memberSeats.add(seatLine);
                memberTotal = memberTotal.add(seatLine.getPrice() != null ? seatLine.getPrice() : BigDecimal.ZERO);
                if (idx < ticketLines.size()) {
                    memberTickets.add(ticketLines.get(idx));
                }
            }
            if (memberSeats.isEmpty()) {
                continue;
            }

            List<BookingResponse.ComboLine> memberCombos = resolveMemberComboLines(member.getCombosJson());
            for (BookingResponse.ComboLine combo : memberCombos) {
                if (combo.getPrice() != null) {
                    memberTotal = memberTotal.add(combo.getPrice());
                }
            }
            try {
                sendTheaterTicketEmailNotification(
                        member.getUserUuid(),
                        bookingUuid,
                        showtimeUuid,
                        memberSeats,
                        memberCombos,
                        memberTickets,
                        memberTotal);
            } catch (Exception ignored) {
                // Keep booking flow non-blocking for individual member email failures.
            }
        }
    }

    private List<BookingResponse.ComboLine> resolveMemberComboLines(String combosJson) {
        List<BookingResponse.ComboLine> lines = new ArrayList<>();
        if (combosJson == null || combosJson.isBlank() || "[]".equals(combosJson.trim())) {
            return lines;
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<com.thdpv.movietheater.orbit.dto.OrbitComboItem> items = mapper.readValue(
                    combosJson,
                    new com.fasterxml.jackson.core.type.TypeReference<List<com.thdpv.movietheater.orbit.dto.OrbitComboItem>>() {});
            if (items == null || items.isEmpty()) {
                return lines;
            }
            Map<UUID, Integer> quantities = new LinkedHashMap<>();
            for (com.thdpv.movietheater.orbit.dto.OrbitComboItem item : items) {
                if (item == null || item.getComboUuid() == null || item.getQuantity() <= 0) {
                    continue;
                }
                quantities.merge(item.getComboUuid(), item.getQuantity(), Integer::sum);
            }
            if (quantities.isEmpty()) {
                return lines;
            }
            List<ComboPrice> comboPrices = bookingRepository.loadCombos(quantities.keySet());
            for (ComboPrice comboPrice : comboPrices) {
                int quantity = quantities.getOrDefault(comboPrice.comboUuid(), 0);
                if (quantity <= 0) {
                    continue;
                }
                BigDecimal lineTotal = comboPrice.unitPrice().multiply(BigDecimal.valueOf(quantity));
                lines.add(new BookingResponse.ComboLine(
                        comboPrice.comboUuid(), comboPrice.name(), quantity, lineTotal));
            }
        } catch (Exception ignored) {
            return lines;
        }
        return lines;
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

        List<TheaterTicketQrItem> qrItems = new ArrayList<>();
        for (int i = 0; i < ticketLines.size(); i++) {
            BookingResponse.TicketLine ticket = ticketLines.get(i);
            String seatLabel = i < seatLines.size()
                    ? seatLines.get(i).getRowName() + seatLines.get(i).getSeatNumber()
                    : "";
            qrItems.add(new TheaterTicketQrItem(ticket.getTicketCode(), seatLabel));
        }

        theaterNotificationService.sendTheaterTicketEmail(
                userUuid,
                bookingUuid,
                movieTitle,
                cinemaName,
                showtimeLabel,
                seatsLabel,
                combosLabel,
                formatPrice(totalPrice),
                qrItems);
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
            Map<UUID, Movie> moviesByUuid = movieRepository.findAllByIdWithMedias(movieUuids).stream()
                    .collect(Collectors.toMap(Movie::getUuid, movie -> movie));
            for (CustomerBookingHistoryResponse response : responses) {
                if (response.getMovieUuid() != null) {
                    Movie movie = moviesByUuid.get(response.getMovieUuid());
                    if (movie != null) {
                        response.setMoviePosterUrl(resolvePrimaryPosterUrl(movie));
                        response.setMovieAgeRestriction(movie.getAgeRestriction());
                    }
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
        List<UUID> bookingUuids = new ArrayList<>();

        for (Object[] row : rows) {
            UUID bookingUuid = toUuid(row[0]);
            if (bookingUuid != null) {
                bookingUuids.add(bookingUuid);
            }
        }

        Map<UUID, com.thdpv.movietheater.booking.entity.Payment> paymentsByBooking = bookingUuids.isEmpty()
                ? Map.of()
                : paymentService.findLatestPayments(bookingUuids);

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
            OffsetDateTime endTime = bookingRepository.toOffsetDateTime(row[16]);
            boolean allTicketsUsed = row[17] != null && ((Number) row[17]).intValue() == 1;

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
            var payment = paymentsByBooking.get(bookingUuid);
            if (payment != null) {
                item.setPaymentMethod(formatPaymentMethodLabel(payment.getMethod()));
                item.setPaymentStatus(payment.getStatus());
            } else {
                item.setPaymentMethod("Ví NASA");
            }
            item.setPurchasedAt(createdAt != null
                    ? createdAt.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm | dd/MM/yyyy"))
                    : "");

            // Derive a time/usage-aware status so the history mirrors the ticket wallet: a paid (CONFIRMED)
            // theater booking whose showtime has ended is no longer "Thành công" but "Hết hạn" (no-show) or
            // "Đã sử dụng" (fully checked in). This is computed at read time — no DB mutation — so revenue,
            // cancellation and refund flows that key off booking.status are untouched.
            String activityStatus;
            boolean isOnline = "ONLINE".equalsIgnoreCase(bookingType);
            if (isCancelledBookingStatus(bookingStatus)) {
                activityStatus = "cancelled";
            } else if (allTicketsUsed) {
                activityStatus = "used";
            } else if (!isOnline) {
                // Theater ticket stays valid until the showtime ends; showtimeRaw holds the start as fallback.
                OffsetDateTime cutoff = endTime != null ? endTime : showtimeRaw;
                activityStatus = (cutoff != null && OffsetDateTime.now().isAfter(cutoff)) ? "expired" : "active";
            } else {
                activityStatus = "active";
            }
            item.setActivityStatus(activityStatus);

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
            case "COUNTER_CASH" -> "Tiền mặt tại quầy";
            case "COUNTER_CARD" -> "Thẻ tại quầy";
            case "COUNTER_VIETQR" -> "VietQR tại quầy";
            case "VIETQR" -> "VietQR chuyển khoản";
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
    public CheckInTicketResponse checkInTicket(String ticketCode, UUID currentRoomUuid) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Mã vé không hợp lệ");
        }
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy vé"));

        Booking booking = bookingJpaRepository.findById(ticket.getBookingUuid()).orElse(null);
        UUID showtimeUuid = booking != null ? booking.getShowtimeUuid() : null;
        UUID expectedRoomUuid = resolveExpectedRoomUuid(ticket, showtimeUuid);

        if (booking != null && isCancelledBookingStatus(booking.getStatus())) {
            return buildCheckInResponse("CANCELLED", "Vé đã bị hủy", ticket, showtimeUuid,
                    expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }

        if (!TICKET_STATUS_ISSUED.equalsIgnoreCase(ticket.getStatus())) {
            return buildCheckInResponse("ALREADY_USED", "Vé đã được soát hoặc không còn hiệu lực", ticket,
                    showtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }

        if (currentRoomUuid != null && expectedRoomUuid != null && !currentRoomUuid.equals(expectedRoomUuid)) {
            return buildCheckInResponse("MISMATCHED_ROOM", "Vé hợp lệ nhưng không đúng phòng đang trực", ticket,
                    showtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }

        CheckInTicketResponse windowRejection = validateShowtimeCheckInWindow(
                resolveEffectiveShowtimeUuid(ticket, showtimeUuid),
                ticket, showtimeUuid, expectedRoomUuid, currentRoomUuid);
        if (windowRejection != null) {
            return windowRejection;
        }

        OffsetDateTime checkedInAt = OffsetDateTime.now();
        int updated = ticketRepository.markUsedIfIssued(ticket.getUuid(), checkedInAt);
        if (updated == 0) {
            return buildCheckInResponse("ALREADY_USED", "Vé đã được soát hoặc không còn hiệu lực", ticket,
                    showtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }

        realtimeEventPublisher.notifyTicketCheckedIn(ticket.getBookingUuid(), showtimeUuid, ticketCode.trim());
        return buildCheckInResponse("VALID", "Soát vé thành công", ticket, showtimeUuid,
                expectedRoomUuid, currentRoomUuid, checkedInAt);
    }

    private UUID resolveEffectiveShowtimeUuid(Ticket ticket, UUID fallbackShowtimeUuid) {
        UUID showtimeUuid = fallbackShowtimeUuid;
        if (ticket.getBookingSeatUuid() != null) {
            showtimeUuid = bookingSeatRepository.findById(ticket.getBookingSeatUuid())
                    .map(BookingSeat::getShowtimeUuid)
                    .orElse(showtimeUuid);
        }
        return showtimeUuid;
    }

    private CheckInTicketResponse validateShowtimeCheckInWindow(UUID effectiveShowtimeUuid, Ticket ticket,
            UUID responseShowtimeUuid, UUID expectedRoomUuid, UUID currentRoomUuid) {
        if (effectiveShowtimeUuid == null) {
            return null;
        }
        Showtime showtime = showtimeRepository.findById(effectiveShowtimeUuid).orElse(null);
        if (showtime == null) {
            return null;
        }
        if (ShowtimeStatus.CANCELLED.equals(showtime.getStatus())) {
            return buildCheckInResponse("SHOW_CANCELLED", "Suất chiếu đã bị hủy — không thể soát vé", ticket,
                    responseShowtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }
        if (!systemConfigService.isCheckInWindowEnforced()) {
            return null;
        }
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime start = showtime.getStartTime();
        OffsetDateTime end = showtime.getEndTime();
        int earlyMinutes = systemConfigService.getCheckInEarlyMinutes();
        int graceMinutes = systemConfigService.getCheckInGraceMinutes();
        if (start != null && now.isBefore(start.minusMinutes(earlyMinutes))) {
            return buildCheckInResponse("TOO_EARLY",
                    "Chưa đến giờ soát vé (mở soát trước giờ chiếu " + earlyMinutes + " phút)", ticket,
                    responseShowtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }
        if (end != null && now.isAfter(end.plusMinutes(graceMinutes))) {
            return buildCheckInResponse("SHOW_ENDED", "Suất chiếu đã kết thúc — không thể soát vé", ticket,
                    responseShowtimeUuid, expectedRoomUuid, currentRoomUuid, ticket.getCheckedInAt());
        }
        return null;
    }

    @Transactional
    public void checkInTicket(String ticketCode) {
        checkInTicket(ticketCode, null);
    }

    private UUID resolveExpectedRoomUuid(Ticket ticket, UUID fallbackShowtimeUuid) {
        UUID showtimeUuid = fallbackShowtimeUuid;
        if (ticket.getBookingSeatUuid() != null) {
            showtimeUuid = bookingSeatRepository.findById(ticket.getBookingSeatUuid())
                    .map(BookingSeat::getShowtimeUuid)
                    .orElse(showtimeUuid);
        }
        if (showtimeUuid == null) {
            return null;
        }
        return showtimeRepository.findById(showtimeUuid)
                .map(Showtime::getCinemaRoomUuid)
                .orElse(null);
    }

    private CheckInTicketResponse buildCheckInResponse(String status, String message, Ticket ticket,
            UUID showtimeUuid, UUID expectedRoomUuid, UUID currentRoomUuid, OffsetDateTime checkedInAt) {
        return new CheckInTicketResponse(
                status,
                message,
                ticket.getUuid(),
                ticket.getBookingUuid(),
                showtimeUuid,
                expectedRoomUuid,
                currentRoomUuid,
                checkedInAt);
    }

    public void cancelBooking(UUID bookingUuid, String email) {
        UUID actorUuid = email != null && !email.isBlank() ? resolveRequiredUserUuid(email) : null;
        cancellationRefundService.cancelBooking(bookingUuid, actorUuid, "CUSTOMER", false, null, false);
    }

    private record ResolvedCombo(UUID comboUuid, String name, Integer quantity, BigDecimal lineTotal) {
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

        return buildVodStatusResponse(booking, movie, OffsetDateTime.now());
    }

    @Transactional(readOnly = true)
    public Map<UUID, VodStatusResponse> getVodStatusBatch(String currentUserEmail, List<UUID> movieUuids) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        List<UUID> uniqueUuids = movieUuids == null
                ? List.of()
                : movieUuids.stream().filter(java.util.Objects::nonNull).distinct().limit(50).toList();

        Map<UUID, VodStatusResponse> result = new java.util.LinkedHashMap<>();
        for (UUID movieUuid : uniqueUuids) {
            result.put(movieUuid, new VodStatusResponse(false, "NONE", null, null, null));
        }
        if (uniqueUuids.isEmpty()) {
            return result;
        }

        List<Booking> bookings = bookingJpaRepository.findOnlineConfirmedBookingsForUserAndMovies(userUuid, uniqueUuids);
        Map<UUID, Booking> latestByMovie = new java.util.LinkedHashMap<>();
        for (Booking booking : bookings) {
            latestByMovie.putIfAbsent(booking.getMovieUuid(), booking);
        }

        Map<UUID, Movie> moviesByUuid = movieRepository.findAllById(latestByMovie.keySet()).stream()
                .collect(Collectors.toMap(Movie::getUuid, movie -> movie));

        OffsetDateTime now = OffsetDateTime.now();
        for (Map.Entry<UUID, Booking> entry : latestByMovie.entrySet()) {
            Movie movie = moviesByUuid.get(entry.getKey());
            if (movie != null) {
                result.put(entry.getKey(), buildVodStatusResponse(entry.getValue(), movie, now));
            }
        }
        return result;
    }

    private VodStatusResponse buildVodStatusResponse(Booking booking, Movie movie, OffsetDateTime now) {
        String playbackState = "WAITING_FOR_PLAY";
        String streamingUrl = null;

        if (booking.getFirstPlayedAt() != null) {
            if (booking.getExpiresAt() != null && now.isAfter(booking.getExpiresAt())) {
                playbackState = "EXPIRED";
            } else {
                playbackState = "STREAMING";
                // Không trả token đã lưu qua API trạng thái. Client phải tạo phiên mới qua /play.
                streamingUrl = null;
            }
        }

        VodStatusResponse response = new VodStatusResponse(
                true,
                playbackState,
                booking.getFirstPlayedAt(),
                booking.getFirstPlayedAt() != null ? booking.getExpiresAt() : null,
                streamingUrl);
        response.setPositionSeconds(booking.getVodPositionSeconds());
        response.setDurationSeconds(booking.getVodDurationSeconds());
        response.setProgressPercent(calcVodProgressPercent(booking));
        return response;
    }

    private Integer calcVodProgressPercent(Booking booking) {
        Integer position = booking.getVodPositionSeconds();
        Integer duration = booking.getVodDurationSeconds();
        if (position == null || position <= 0) {
            return 0;
        }
        int total = duration != null && duration > 0
                ? duration
                : 1;
        return Math.min(100, Math.round((position * 100f) / total));
    }

    @Transactional(readOnly = true)
    public List<com.thdpv.movietheater.booking.dto.response.VodHistoryItemResponse> getVodWatchHistory(
            String currentUserEmail) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        List<Booking> history = bookingJpaRepository.findVodWatchHistory(userUuid);
        Map<UUID, Booking> latestBookingByMovie = new LinkedHashMap<>();
        for (Booking booking : history) {
            if (booking.getMovieUuid() != null) {
                latestBookingByMovie.putIfAbsent(booking.getMovieUuid(), booking);
            }
        }
        List<Booking> bookings = List.copyOf(latestBookingByMovie.values());
        if (bookings.isEmpty()) {
            return List.of();
        }
        Map<UUID, Movie> movies = movieRepository.findAllByIdWithMedias(
                bookings.stream().map(Booking::getMovieUuid).filter(java.util.Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Movie::getUuid, movie -> movie));

        return bookings.stream()
                .map(booking -> {
                    Movie movie = movies.get(booking.getMovieUuid());
                    com.thdpv.movietheater.booking.dto.response.VodHistoryItemResponse item =
                            new com.thdpv.movietheater.booking.dto.response.VodHistoryItemResponse();
                    item.setMovieUuid(booking.getMovieUuid());
                    item.setMovieTitle(movie != null ? movie.getTitle() : null);
                    if (movie != null && movie.getMovieMedias() != null) {
                        item.setPrimaryMediaUrl(movie.getMovieMedias().stream()
                                .filter(media -> Boolean.TRUE.equals(media.getIsPrimary()))
                                .map(media -> media.getMediaUrl())
                                .findFirst()
                                .orElse(movie.getMovieMedias().isEmpty()
                                        ? null
                                        : movie.getMovieMedias().get(0).getMediaUrl()));
                    }
                    item.setPositionSeconds(booking.getVodPositionSeconds());
                    item.setDurationSeconds(booking.getVodDurationSeconds());
                    item.setProgressPercent(calcVodProgressPercent(booking));
                    item.setLastWatchedAt(booking.getVodLastWatchedAt());
                    item.setExpiresAt(booking.getExpiresAt());
                    return item;
                })
                .toList();
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
        return activateVodPlay(currentUserEmail, movieUuid, null);
    }

    @Transactional
    public VodPlayResponse activateVodPlay(String currentUserEmail, UUID movieUuid, UUID bookingUuid) {
        UUID userUuid = resolveRequiredUserUuid(currentUserEmail);
        Booking booking = resolveVodBookingForPlay(userUuid, movieUuid, bookingUuid);

        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        String streamingUrl = S3MediaBorderUtils.resolveStreamingUrl(movie);
        if (streamingUrl == null || streamingUrl.isBlank()
                || !S3MediaBorderUtils.isAwsMovieStreamingUrl(streamingUrl)) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Phim chưa được cấu hình link phát trực tuyến S3 (movie/...). Vui lòng liên hệ quản trị viên.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        String streamToken = StreamTokenUtils.generate();
        String storedStreamToken = StreamTokenUtils.hash(streamToken);

        if (booking.getFirstPlayedAt() != null) {
            if (booking.getExpiresAt() != null && now.isAfter(booking.getExpiresAt())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
            }
            booking.setStreamToken(storedStreamToken);
            bookingJpaRepository.save(booking);
            // URL không kèm token — token đi qua cookie HttpOnly / header heartbeat.
            return buildVodPlayResponse(streamToken, streamingUrl, booking.getExpiresAt());
        }

        int durationMinutes = movie.getDurationMinutes() != null ? movie.getDurationMinutes() : 120;
        double lockMultiplier = systemConfigService.getOnlineWatchLockMultiplier();
        OffsetDateTime firstPlayedAt = now;
        OffsetDateTime expiresAt = firstPlayedAt.plusMinutes(Math.round(durationMinutes * lockMultiplier));

        int claimed = bookingJpaRepository.claimFirstPlay(
                booking.getUuid(), firstPlayedAt, expiresAt, storedStreamToken, now);
        if (claimed == 0) {
            // Another concurrent activate won first play — resume that watch window without firing missions again.
            Booking latest = bookingJpaRepository.findById(booking.getUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
            if (latest.getExpiresAt() != null && now.isAfter(latest.getExpiresAt())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
            }
            latest.setStreamToken(storedStreamToken);
            bookingJpaRepository.save(latest);
            return buildVodPlayResponse(streamToken, streamingUrl, latest.getExpiresAt());
        }

        List<MissionCompletionResponse> missionCompletions = missionService.handleEvent(
                MissionEventPayload.vodFirstPlay(userUuid, booking.getUuid(), movieUuid, now));

        VodPlayResponse response = buildVodPlayResponse(streamToken, streamingUrl, expiresAt);
        response.setMissionCompletions(missionCompletions);
        return response;
    }

    private VodPlayResponse buildVodPlayResponse(
            String rawStreamToken,
            String streamingUrl,
            OffsetDateTime expiresAt) {
        VodPlayResponse response = new VodPlayResponse(
                rawStreamToken,
                S3MediaBorderUtils.toStreamUrl(streamingUrl),
                expiresAt);
        response.setStreamSessionId(StreamTokenUtils.fingerprint(rawStreamToken));
        return response;
    }

    private Booking resolveVodBookingForPlay(UUID userUuid, UUID movieUuid, UUID bookingUuid) {
        Booking latest = bookingJpaRepository
                .findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                        userUuid, movieUuid, "ONLINE", BOOKING_STATUS_CONFIRMED)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Bạn chưa mua vé xem trực tuyến phim này"));

        Booking booking;
        if (bookingUuid != null) {
            booking = bookingJpaRepository.findById(bookingUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Mã vé không hợp lệ"));
            if (!userUuid.equals(booking.getUserUuid())
                    || !movieUuid.equals(booking.getMovieUuid())
                    || !"ONLINE".equalsIgnoreCase(booking.getBookingType())
                    || !BOOKING_STATUS_CONFIRMED.equalsIgnoreCase(booking.getStatus())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Mã vé không hợp lệ cho phim này");
            }
            if (!latest.getUuid().equals(booking.getUuid())) {
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Mã vé không còn hiệu lực. Vui lòng dùng vé mua mới nhất.");
            }
        } else {
            booking = latest;
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (booking.getFirstPlayedAt() != null && booking.getExpiresAt() != null && now.isAfter(booking.getExpiresAt())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Vé xem phim trực tuyến của bạn đã hết hạn");
        }
        return booking;
    }

    @Transactional
    public void vodHeartbeat(String currentUserEmail, UUID movieUuid, String streamToken,
            Integer positionSeconds, Integer durationSeconds) {
        vodHeartbeat(currentUserEmail, movieUuid, streamToken, null, positionSeconds, durationSeconds);
    }

    @Transactional
    public void vodHeartbeat(String currentUserEmail, UUID movieUuid, String streamToken,
            String streamSessionId, Integer positionSeconds, Integer durationSeconds) {
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

        if (!StreamTokenUtils.matches(streamToken, booking.getStreamToken())) {
            // Kick-out: conflict (409)
            throw new AppException(ErrorCode.CONFLICT, "Tài khoản đang được xem trên thiết bị khác");
        }
        if (streamSessionId != null
                && !StreamTokenUtils.matchesFingerprint(streamSessionId, booking.getStreamToken())) {
            throw new AppException(ErrorCode.CONFLICT, "Phiên xem này đã được thay thế bởi phiên khác");
        }

        if (positionSeconds != null && positionSeconds >= 0) {
            booking.setVodPositionSeconds(positionSeconds);
        }
        if (durationSeconds != null && durationSeconds > 0) {
            booking.setVodDurationSeconds(durationSeconds);
        }
        booking.setVodLastWatchedAt(OffsetDateTime.now());
        booking.setUpdatedAt(OffsetDateTime.now());
        bookingJpaRepository.save(booking);
    }

    @Transactional
    public int revokeExpiredVodStreamTokens() {
        return bookingJpaRepository.revokeExpiredVodStreamTokens(OffsetDateTime.now());
    }
}
