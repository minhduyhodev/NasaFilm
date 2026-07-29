package com.thdpv.movietheater.booking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.thdpv.movietheater.booking.dto.response.AdminRefundListItemResponse;
import com.thdpv.movietheater.booking.dto.response.CancelBookingResponse;
import com.thdpv.movietheater.booking.dto.response.CancellationPreviewResponse;
import com.thdpv.movietheater.booking.dto.response.RefundStatusResponse;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.CancellationRequest;
import com.thdpv.movietheater.booking.entity.Payment;
import com.thdpv.movietheater.booking.entity.Refund;
import com.thdpv.movietheater.booking.entity.Ticket;
import com.thdpv.movietheater.booking.enums.BookingStatus;
import com.thdpv.movietheater.booking.enums.PaymentStatus;
import com.thdpv.movietheater.booking.enums.RefundStatus;
import com.thdpv.movietheater.booking.repository.BookingComboRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.CancellationRequestRepository;
import com.thdpv.movietheater.booking.repository.PaymentRepository;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.booking.repository.RefundRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.payment.service.PaymentGatewayService;
import com.thdpv.movietheater.payment.service.PaymentService;
import com.thdpv.movietheater.payment.service.WalletService;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.repository.OrbitRoomRepository;
import com.thdpv.movietheater.orbit.service.OrbitRoomService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CancellationRefundService {

    private static final String BOOKING_STATUS_CONFIRMED = "CONFIRMED";
    private static final String TICKET_CANCELLED = "CANCELLED";
    private static final String TICKET_USED = "USED";

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingComboRepository bookingComboRepository;
    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final CancellationRequestRepository cancellationRequestRepository;
    private final RefundRepository refundRepository;
    private final BookingNativeRepository bookingNativeRepository;
    private final UserRepository userRepository;
    private final SystemConfigService systemConfigService;
    private final PaymentGatewayService paymentGatewayService;
    private final PaymentService paymentService;
    private final AuditLogService auditLogService;
    private final SeatMapEventPublisher seatMapEventPublisher;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final PromotionRepository promotionRepository;
    private final VoucherRedemptionService voucherRedemptionService;
    private final WalletService walletService;
    private final StripeGateway stripeGateway;
    private final MovieRepository movieRepository;
    private final MissionService missionService;
    private final OrbitRoomRepository orbitRoomRepository;
    private final PlatformTransactionManager transactionManager;

    /** Lazy field injection breaks circular dependency with OrbitRoomService. */
    @Lazy
    @Autowired
    private OrbitRoomService orbitRoomService;

    @Transactional(readOnly = true)
    public CancellationPreviewResponse getCancellationPreview(UUID bookingUuid, UUID actorUuid, boolean adminOverride,
            boolean showtimeCancelled) {
        Booking booking = bookingRepository.findById(bookingUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!adminOverride && actorUuid != null && !booking.getUserUuid().equals(actorUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Không có quyền xem đơn đặt vé này");
        }

        CancellationPreviewResponse preview = new CancellationPreviewResponse();
        preview.setBookingUuid(bookingUuid);
        preview.setTotalPaid(booking.getTotalPrice());
        preview.setCancellationCutoffMinutes(systemConfigService.getCancellationCutoffMinutes());
        preview.setBookingType(booking.getBookingType());
        preview.setVodActivated(booking.getFirstPlayedAt() != null);
        preview.setManualApprovalRequired(systemConfigService.isRefundManualApprovalRequired());

        List<String> blocked = validateCancellationRules(booking, showtimeCancelled);
        preview.setBlockedReasons(blocked);
        preview.setCancellable(blocked.isEmpty());

        RefundCalculation calc = calculateRefund(booking.getTotalPrice(), showtimeCancelled);
        preview.setCancellationFee(calc.fee());
        preview.setRefundAmount(calc.refundAmount());
        preview.setRefundable(calc.refundAmount().compareTo(BigDecimal.ZERO) > 0);

        if (booking.getShowtimeUuid() != null) {
            preview.setShowtimeStart(bookingNativeRepository.getShowtimeStartTime(booking.getShowtimeUuid()));
        }

        if (!blocked.isEmpty()) {
            preview.setMessage(String.join("; ", blocked));
        } else if (isOnlineBooking(booking)) {
            if (preview.isRefundable()) {
                preview.setMessage("Hủy vé xem online chưa kích hoạt. Bạn sẽ được hoàn "
                        + formatMoney(calc.refundAmount())
                        + (calc.fee().compareTo(BigDecimal.ZERO) > 0 ? " (phí hủy " + formatMoney(calc.fee()) + ")" : ""));
            } else {
                preview.setMessage("Vé online sẽ bị hủy và không được hoàn tiền theo chính sách.");
            }
        } else if (preview.isRefundable()) {
            preview.setMessage("Bạn sẽ được hoàn " + formatMoney(calc.refundAmount())
                    + (calc.fee().compareTo(BigDecimal.ZERO) > 0 ? " (phí hủy " + formatMoney(calc.fee()) + ")" : ""));
        } else {
            preview.setMessage("Vé sẽ bị hủy và không được hoàn tiền.");
        }
        return preview;
    }

    public CancelBookingResponse cancelBooking(UUID bookingUuid, UUID actorUuid, String actorRole, boolean adminOverride,
            String reason, boolean showtimeCancelled) {
        TransactionTemplate transaction = requiresNewTransaction();
        CancelBookingResponse response = transaction.execute(status ->
                cancelBookingInTransaction(
                        bookingUuid, actorUuid, actorRole, adminOverride, reason, showtimeCancelled));
        if (response == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Không thể xử lý hủy đặt vé");
        }

        if (response.getRefundUuid() != null
                && RefundStatus.PROCESSING.name().equals(response.getRefundStatus())) {
            try {
                Refund processed = processApprovedRefund(response.getRefundUuid(), actorUuid, actorRole);
                response.setRefundStatus(processed.getStatus());
                response.setBookingStatus(BookingStatus.REFUNDED.name());
            } catch (AppException ex) {
                // Cancellation already committed successfully. Keep the refund retryable instead of reporting the
                // entire cancellation as failed after a transient gateway error.
                response.setRefundStatus(RefundStatus.PENDING.name());
                response.setMessage("Hủy vé thành công. Hoàn tiền tạm thời chưa hoàn tất và đã được đưa về chờ xử lý lại.");
            }
        }
        return response;
    }

    private CancelBookingResponse cancelBookingInTransaction(
            UUID bookingUuid,
            UUID actorUuid,
            String actorRole,
            boolean adminOverride,
            String reason,
            boolean showtimeCancelled) {
        Booking booking = bookingRepository.findById(bookingUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!adminOverride && actorUuid != null && !booking.getUserUuid().equals(actorUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Không có quyền hủy đặt vé này");
        }

        List<String> blocked = validateCancellationRules(booking, showtimeCancelled);
        if (!blocked.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, String.join("; ", blocked));
        }

        OffsetDateTime now = OffsetDateTime.now();
        int locked = bookingRepository.updateStatusIf(bookingUuid, BOOKING_STATUS_CONFIRMED,
                BookingStatus.CANCELLING.name(), now);
        if (locked == 0) {
            throw new AppException(ErrorCode.CONFLICT, "Đơn đặt vé đang được xử lý hoặc không thể hủy");
        }

        RefundCalculation calc = calculateRefund(booking.getTotalPrice(), showtimeCancelled);

        CancellationRequest request = new CancellationRequest();
        request.setUuid(UUID.randomUUID());
        request.setBookingUuid(bookingUuid);
        request.setRequestedByUuid(actorUuid != null ? actorUuid : booking.getUserUuid());
        request.setReason(reason);
        request.setCancellationFee(calc.fee());
        request.setRefundAmount(calc.refundAmount());
        request.setStatus("PROCESSING");
        request.setInitiatedByRole(actorRole);
        request.setShowtimeCancelled(showtimeCancelled);
        request.setCreatedAt(now);
        request.setUpdatedAt(now);
        cancellationRequestRepository.save(request);

        var bookingSeats = bookingSeatRepository.findByBookingUuid(bookingUuid);
        java.util.Map<UUID, BigDecimal> seatPriceByUuid = new java.util.HashMap<>();
        for (var seat : bookingSeats) {
            seatPriceByUuid.put(seat.getSeatUuid(), seat.getPrice());
        }
        var orbitRoom = orbitRoomRepository.findByBookingUuid(bookingUuid);

        bookingSeatRepository.deleteByBookingUuid(bookingUuid);
        bookingComboRepository.deleteByBookingUuid(bookingUuid);

        List<Ticket> tickets = ticketRepository.findByBookingUuid(bookingUuid);
        for (Ticket ticket : tickets) {
            ticket.setStatus(TICKET_CANCELLED);
        }
        if (!tickets.isEmpty()) {
            ticketRepository.saveAll(tickets);
        }

        int scoreDeducted = calculateScore(booking.getTotalPrice());
        if (orbitRoom.isPresent()) {
            orbitRoomService.rollbackOrbitBookingRewards(
                    orbitRoom.get().getUuid(), bookingUuid, seatPriceByUuid, now);
        } else if (scoreDeducted > 0) {
            bookingNativeRepository.addUserScore(booking.getUserUuid(), -scoreDeducted);
            bookingNativeRepository.addLifetimeScore(booking.getUserUuid(), -scoreDeducted);
            bookingNativeRepository.insertRefundScoreHistory(booking.getUserUuid(), scoreDeducted, bookingUuid, now);
        }

        booking.setStatus(BookingStatus.CANCELLED.name());
        booking.setCancelledAt(now);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        restorePromotionAndVoucher(booking);

        request.setStatus("COMPLETED");
        request.setCompletedAt(now);
        request.setUpdatedAt(now);
        cancellationRequestRepository.save(request);

        auditLogService.log("BOOKING", bookingUuid, "BOOKING_CANCELLED", actorUuid, actorRole,
                java.util.Map.of("reason", reason != null ? reason : "", "fee", calc.fee(), "refund", calc.refundAmount()));

        try {
            if (orbitRoom.isEmpty()) {
                missionService.rollbackBookingProgress(booking.getUserUuid(), bookingUuid, now);
            }
        } catch (Exception ignored) {
            // Không chặn hủy vé nếu hoàn tác nhiệm vụ thất bại
        }

        Refund refund = null;
        if (calc.refundAmount().compareTo(BigDecimal.ZERO) > 0) {
            refund = initiateRefund(booking, request, calc.refundAmount(), actorUuid, actorRole);
            booking = bookingRepository.findById(bookingUuid).orElse(booking);
        }

        if (booking.getShowtimeUuid() != null) {
            seatMapEventPublisher.notifySeatMapUpdated(booking.getShowtimeUuid());
        }
        realtimeEventPublisher.notifyBookingCancelled(bookingUuid, booking.getShowtimeUuid());

        CancelBookingResponse response = new CancelBookingResponse();
        response.setBookingUuid(bookingUuid);
        response.setBookingStatus(booking.getStatus());
        response.setCancellationRequestUuid(request.getUuid());
        response.setCancellationFee(calc.fee());
        response.setRefundAmount(calc.refundAmount());
        if (refund != null) {
            response.setRefundUuid(refund.getUuid());
            response.setRefundStatus(refund.getStatus());
        }
        if (refund != null) {
            boolean walletRefund = paymentRepository.findById(refund.getPaymentUuid())
                    .map(p -> "WALLET".equalsIgnoreCase(p.getMethod()))
                    .orElse(false);
            if (RefundStatus.PENDING.name().equals(refund.getStatus())) {
                response.setMessage("Hủy vé thành công. Yêu cầu hoàn "
                        + formatMoney(calc.refundAmount())
                        + " đang chờ admin duyệt tại trang Duyệt hoàn tiền.");
            } else if (walletRefund) {
                response.setMessage("Hủy vé thành công. Tiền đã hoàn về Ví NASA.");
            } else {
                response.setMessage(isOnlineBooking(booking)
                        ? "Hủy vé online thành công. Tiền hoàn qua Mock Gateway trong 3-7 ngày làm việc."
                        : "Hủy vé thành công. Tiền hoàn qua Mock Gateway trong 3-7 ngày làm việc.");
            }
        } else {
            response.setMessage("Hủy vé thành công. Vé không được hoàn tiền theo chính sách.");
        }
        return response;
    }

    public Refund approveRefund(UUID refundUuid, UUID adminUuid) {
        TransactionTemplate transaction = requiresNewTransaction();
        UUID claimedRefundUuid = transaction.execute(status -> {
            Refund refund = refundRepository.findById(refundUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));

            if (!RefundStatus.PENDING.name().equals(refund.getStatus())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Yêu cầu hoàn tiền không ở trạng thái chờ duyệt");
            }

            int claimed = refundRepository.transitionStatus(
                    refundUuid,
                    RefundStatus.PENDING.name(),
                    RefundStatus.PROCESSING.name(),
                    OffsetDateTime.now());
            if (claimed == 0) {
                throw new AppException(ErrorCode.CONFLICT,
                        "Yêu cầu hoàn tiền đang được xử lý hoặc đã hoàn tất");
            }
            return refundUuid;
        });
        if (claimedRefundUuid == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Không thể khóa yêu cầu hoàn tiền");
        }
        return processApprovedRefund(claimedRefundUuid, adminUuid, "ADMIN");
    }

    @Transactional(readOnly = true)
    public RefundStatusResponse getRefundStatus(UUID bookingUuid, UUID actorUuid, boolean adminOverride) {
        Booking booking = bookingRepository.findById(bookingUuid)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (!adminOverride && actorUuid != null && !booking.getUserUuid().equals(actorUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        RefundStatusResponse response = new RefundStatusResponse();
        response.setBookingUuid(bookingUuid);
        response.setBookingStatus(booking.getStatus());

        cancellationRequestRepository.findFirstByBookingUuidOrderByCreatedAtDesc(bookingUuid)
                .ifPresent(req -> {
                    response.setCancellationRequestUuid(req.getUuid());
                    response.setCancellationFee(req.getCancellationFee());
                    response.setRequestedAt(req.getCreatedAt());
                });

        refundRepository.findFirstByBookingUuidOrderByCreatedAtDesc(bookingUuid).ifPresent(refund -> {
            response.setRefundUuid(refund.getUuid());
            response.setRefundStatus(refund.getStatus());
            response.setRefundAmount(refund.getAmount());
            response.setCompletedAt(refund.getCompletedAt());
            response.setTimeline(buildTimeline(refund));
        });

        return response;
    }

    @Transactional(readOnly = true)
    public Page<AdminRefundListItemResponse> listPendingRefunds(Pageable pageable) {
        Page<Refund> refunds = refundRepository.findByStatusOrderByCreatedAtDesc(
                RefundStatus.PENDING.name(), pageable);
        return buildAdminRefundPage(refunds);
    }

    @Transactional(readOnly = true)
    public Page<AdminRefundListItemResponse> listRefundHistory(Pageable pageable) {
        Page<Refund> refunds = refundRepository.findByStatusInOrderByCompletedAtDesc(
                List.of(RefundStatus.COMPLETED.name(), RefundStatus.FAILED.name()), pageable);
        return buildAdminRefundPage(refunds);
    }

    @Transactional(readOnly = true)
    public long countPendingRefunds() {
        return refundRepository.countByStatus(RefundStatus.PENDING.name());
    }

    /**
     * Enrich one refund page with a fixed number of batch queries instead of 4-6 repository calls per row.
     */
    private Page<AdminRefundListItemResponse> buildAdminRefundPage(Page<Refund> refunds) {
        if (refunds.isEmpty()) {
            return refunds.map(refund -> new AdminRefundListItemResponse());
        }

        Map<UUID, Booking> bookings = new HashMap<>();
        bookingRepository.findAllById(refunds.stream().map(Refund::getBookingUuid).distinct().toList())
                .forEach(booking -> bookings.put(booking.getUuid(), booking));

        List<UUID> userUuids = new ArrayList<>();
        List<UUID> movieUuids = new ArrayList<>();
        List<UUID> cancellationRequestUuids = new ArrayList<>();
        for (Refund refund : refunds) {
            Booking booking = bookings.get(refund.getBookingUuid());
            if (booking != null) {
                userUuids.add(booking.getUserUuid());
                if (booking.getMovieUuid() != null) {
                    movieUuids.add(booking.getMovieUuid());
                }
            }
            if (refund.getApprovedByUuid() != null) {
                userUuids.add(refund.getApprovedByUuid());
            }
            if (refund.getCancellationRequestUuid() != null) {
                cancellationRequestUuids.add(refund.getCancellationRequestUuid());
            }
        }

        Map<UUID, User> users = new HashMap<>();
        userRepository.findAllById(userUuids.stream().distinct().toList())
                .forEach(user -> users.put(user.getId(), user));

        Map<UUID, Movie> movies = new HashMap<>();
        movieRepository.findAllById(movieUuids.stream().distinct().toList())
                .forEach(movie -> movies.put(movie.getUuid(), movie));

        Map<UUID, CancellationRequest> cancellationRequests = new HashMap<>();
        cancellationRequestRepository.findAllById(cancellationRequestUuids.stream().distinct().toList())
                .forEach(request -> cancellationRequests.put(request.getUuid(), request));

        // Legacy refunds may not have cancellation_request_uuid. Load latest requests for those bookings in one query.
        List<UUID> legacyBookingUuids = refunds.stream()
                .filter(refund -> refund.getCancellationRequestUuid() == null)
                .map(Refund::getBookingUuid)
                .distinct()
                .toList();
        Map<UUID, CancellationRequest> latestRequestByBooking = new HashMap<>();
        if (!legacyBookingUuids.isEmpty()) {
            cancellationRequestRepository
                    .findByBookingUuidInOrderByCreatedAtDesc(legacyBookingUuids)
                    .forEach(request -> latestRequestByBooking.putIfAbsent(request.getBookingUuid(), request));
        }

        return refunds.map(refund -> buildAdminRefundItem(
                refund, bookings, users, movies, cancellationRequests, latestRequestByBooking));
    }

    private AdminRefundListItemResponse buildAdminRefundItem(
            Refund refund,
            Map<UUID, Booking> bookings,
            Map<UUID, User> users,
            Map<UUID, Movie> movies,
            Map<UUID, CancellationRequest> cancellationRequests,
            Map<UUID, CancellationRequest> latestRequestByBooking) {
        Booking booking = bookings.get(refund.getBookingUuid());
        User customer = booking != null ? users.get(booking.getUserUuid()) : null;
        Movie movie = booking != null && booking.getMovieUuid() != null
                ? movies.get(booking.getMovieUuid())
                : null;
        CancellationRequest cancelReq = refund.getCancellationRequestUuid() != null
                ? cancellationRequests.get(refund.getCancellationRequestUuid())
                : latestRequestByBooking.get(refund.getBookingUuid());
        String cancellationReason = cancelReq != null && cancelReq.getReason() != null
                && !cancelReq.getReason().isBlank() ? cancelReq.getReason().trim() : null;
        BigDecimal cancellationFee = cancelReq != null ? cancelReq.getCancellationFee() : null;

        AdminRefundListItemResponse item = new AdminRefundListItemResponse(
                refund.getUuid(),
                refund.getBookingUuid(),
                refund.getAmount(),
                refund.getStatus(),
                customer != null ? customer.getEmail() : null,
                movie != null ? movie.getTitle() : null,
                refund.getCreatedAt() != null ? refund.getCreatedAt().toString() : null,
                cancellationReason,
                cancellationFee);

        if (refund.getApprovedByUuid() != null) {
            User approver = users.get(refund.getApprovedByUuid());
            if (approver != null) {
                item.setApprovedByEmail(approver.getEmail());
                item.setApprovedByName(approver.getFullName());
            }
        }
        item.setApprovedByRole(refund.getApprovedByRole());
        if (refund.getCompletedAt() != null) {
            item.setApprovedAt(refund.getCompletedAt().toString());
        } else if (RefundStatus.COMPLETED.name().equals(refund.getStatus())
                || RefundStatus.FAILED.name().equals(refund.getStatus())) {
            item.setApprovedAt(refund.getUpdatedAt() != null ? refund.getUpdatedAt().toString() : null);
        }
        return item;
    }

    private Refund initiateRefund(Booking booking, CancellationRequest request, BigDecimal amount, UUID actorUuid,
            String actorRole) {
        Payment payment = paymentService.ensureCompletedPayment(booking, "MOCK");

        String idempotencyKey = "refund-" + booking.getUuid();
        Refund existing = refundRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            return existing;
        }

        OffsetDateTime now = OffsetDateTime.now();
        Refund refund = new Refund();
        refund.setUuid(UUID.randomUUID());
        refund.setBookingUuid(booking.getUuid());
        refund.setPaymentUuid(payment.getUuid());
        refund.setCancellationRequestUuid(request.getUuid());
        refund.setAmount(amount);
        refund.setStatus(systemConfigService.isRefundManualApprovalRequired()
                ? RefundStatus.PENDING.name()
                : RefundStatus.PROCESSING.name());
        refund.setIdempotencyKey(idempotencyKey);
        refund.setCreatedAt(now);
        refund.setUpdatedAt(now);
        refundRepository.save(refund);

        booking.setStatus(BookingStatus.REFUND_PENDING.name());
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        if (systemConfigService.isRefundManualApprovalRequired()) {
            auditLogService.log("REFUND", refund.getUuid(), "REFUND_PENDING_APPROVAL", actorUuid, actorRole, null);
        }
        // Automatic refunds are processed by the outer orchestrator only after this cancellation transaction
        // commits, so gateway latency never holds the cancellation transaction open.
        return refund;
    }

    /**
     * Processes an admin-approved refund without holding a database transaction while waiting for the payment
     * gateway. Claim and completion use short transactions; the external call happens between them.
     */
    private Refund processApprovedRefund(UUID refundUuid, UUID actorUuid, String actorRole) {
        TransactionTemplate transaction = requiresNewTransaction();
        RefundExecutionContext context = transaction.execute(status -> {
            Refund refund = refundRepository.findById(refundUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
            if (!RefundStatus.PROCESSING.name().equals(refund.getStatus())) {
                throw new AppException(ErrorCode.CONFLICT, "Yêu cầu hoàn tiền không còn ở trạng thái xử lý");
            }

            Booking booking = bookingRepository.findById(refund.getBookingUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
            Payment payment = paymentRepository.findById(refund.getPaymentUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch thanh toán"));

            booking.setStatus(BookingStatus.REFUND_PROCESSING.name());
            booking.setUpdatedAt(OffsetDateTime.now());
            bookingRepository.save(booking);

            return new RefundExecutionContext(
                    refund.getUuid(),
                    booking.getUuid(),
                    booking.getUserUuid(),
                    payment.getUuid(),
                    payment.getMethod(),
                    payment.getGatewayTransactionId(),
                    refund.getAmount(),
                    refund.getIdempotencyKey());
        });
        if (context == null) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Không thể chuẩn bị hoàn tiền");
        }

        String method = context.paymentMethod() != null ? context.paymentMethod().trim().toUpperCase() : "";

        if ("WALLET".equals(method) || "VIETQR".equals(method)) {
            return transaction.execute(status -> completeWalletRefund(context, actorUuid, actorRole));
        }

        if ("CARD".equals(method)) {
            String piId = context.gatewayTransactionId();
            if (piId != null && piId.startsWith("pi_")) {
                try {
                    long amountVnd = context.amount().setScale(0, RoundingMode.HALF_UP).longValueExact();
                    String stripeRefundId = stripeGateway.refundPaymentIntent(
                            piId, amountVnd, context.idempotencyKey());
                    return transaction.execute(status ->
                            completeApprovedRefund(context, stripeRefundId, actorUuid, actorRole));
                } catch (RuntimeException ex) {
                    // Stripe refund unavailable — credit NASA wallet so the customer still gets money back.
                    return transaction.execute(status -> completeWalletRefund(context, actorUuid, actorRole));
                }
            }
            return transaction.execute(status -> completeWalletRefund(context, actorUuid, actorRole));
        }

        PaymentGatewayService.GatewayRefundResult gatewayResult;
        try {
            // No active database transaction here: a slow gateway cannot occupy a connection from the pool.
            gatewayResult = paymentGatewayService.refund(
                    context.paymentUuid(), context.amount(), context.idempotencyKey());
        } catch (RuntimeException ex) {
            transaction.executeWithoutResult(status ->
                    returnApprovedRefundToPending(context, actorUuid, actorRole, ex.getMessage()));
            throw new AppException(ErrorCode.INTERNAL_ERROR,
                    "Hoàn tiền qua cổng thanh toán gặp sự cố. Yêu cầu đã được đưa về chờ duyệt để thử lại.");
        }

        if (!gatewayResult.success()) {
            transaction.executeWithoutResult(status ->
                    returnApprovedRefundToPending(
                            context, actorUuid, actorRole, gatewayResult.failureReason()));
            throw new AppException(ErrorCode.INTERNAL_ERROR,
                    "Hoàn tiền thất bại. Yêu cầu đã được đưa về chờ duyệt để thử lại.");
        }

        return transaction.execute(status ->
                completeApprovedRefund(context, gatewayResult.gatewayRefundId(), actorUuid, actorRole));
    }

    private Refund completeWalletRefund(RefundExecutionContext context, UUID actorUuid, String actorRole) {
        String description = "VIETQR".equalsIgnoreCase(context.paymentMethod())
                ? "Hoàn tiền VietQR về ví NASA"
                : "CARD".equalsIgnoreCase(context.paymentMethod())
                        ? "Hoàn tiền thẻ về ví NASA"
                        : "Hoàn tiền hủy vé";
        walletService.creditRefund(
                context.userUuid(),
                context.amount(),
                context.refundUuid(),
                description);
        String gatewayRefundId = "WALLET".equalsIgnoreCase(context.paymentMethod())
                ? "WALLET-CREDIT"
                : "WALLET-CREDIT-" + (context.paymentMethod() != null ? context.paymentMethod().toUpperCase() : "EXT");
        return completeApprovedRefund(context, gatewayRefundId, actorUuid, actorRole);
    }

    private Refund completeApprovedRefund(
            RefundExecutionContext context,
            String gatewayRefundId,
            UUID actorUuid,
            String actorRole) {
        OffsetDateTime now = OffsetDateTime.now();
        Refund refund = refundRepository.findById(context.refundUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        Booking booking = bookingRepository.findById(context.bookingUuid())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        Payment payment = paymentRepository.findById(context.paymentUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch thanh toán"));

        refund.setStatus(RefundStatus.COMPLETED.name());
        refund.setGatewayRefundId(gatewayRefundId);
        refund.setApprovedByUuid(actorUuid);
        refund.setApprovedByRole(actorRole);
        refund.setCompletedAt(now);
        refund.setUpdatedAt(now);
        refundRepository.save(refund);

        payment.setStatus(PaymentStatus.REFUNDED.name());
        payment.setUpdatedAt(now);
        paymentRepository.save(payment);

        booking.setStatus(BookingStatus.REFUNDED.name());
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        auditLogService.log("REFUND", refund.getUuid(), "REFUND_COMPLETED", actorUuid, actorRole, gatewayRefundId);
        return refund;
    }

    private void returnApprovedRefundToPending(
            RefundExecutionContext context,
            UUID actorUuid,
            String actorRole,
            String failureReason) {
        OffsetDateTime now = OffsetDateTime.now();
        Refund refund = refundRepository.findById(context.refundUuid())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu hoàn tiền"));
        Booking booking = bookingRepository.findById(context.bookingUuid())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        refund.setStatus(RefundStatus.PENDING.name());
        refund.setFailureReason(failureReason);
        refund.setUpdatedAt(now);
        refundRepository.save(refund);

        booking.setStatus(BookingStatus.REFUND_PENDING.name());
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        auditLogService.log("REFUND", refund.getUuid(), "REFUND_GATEWAY_ERROR", actorUuid, actorRole,
                failureReason != null ? failureReason : "Unknown gateway error");
    }

    private List<String> validateCancellationRules(Booking booking, boolean showtimeCancelled) {
        List<String> blocked = new ArrayList<>();
        String status = booking.getStatus();
        if (!BOOKING_STATUS_CONFIRMED.equalsIgnoreCase(status)) {
            blocked.add("Chỉ hủy được khi vé ở trạng thái đã đặt (CONFIRMED)");
            return blocked;
        }

        if ("ONLINE".equalsIgnoreCase(booking.getBookingType())
                || isOnlineBookingLabel(booking)) {
            if (booking.getFirstPlayedAt() != null) {
                blocked.add("Vé online đã kích hoạt, không thể hủy");
            }
            return blocked;
        }

        if (booking.getShowtimeUuid() == null) {
            blocked.add("Không tìm thấy suất chiếu");
            return blocked;
        }

        OffsetDateTime startTime = bookingNativeRepository.getShowtimeStartTime(booking.getShowtimeUuid());
        if (startTime == null) {
            blocked.add("Không tìm thấy suất chiếu");
            return blocked;
        }

        if (!showtimeCancelled) {
            OffsetDateTime cutoff = OffsetDateTime.now()
                    .plusMinutes(systemConfigService.getCancellationCutoffMinutes());
            if (cutoff.isAfter(startTime)) {
                blocked.add("Không thể hủy trong vòng "
                        + systemConfigService.getCancellationCutoffMinutes() + " phút trước giờ chiếu");
            }
        }

        List<Ticket> tickets = ticketRepository.findByBookingUuid(booking.getUuid());
        boolean anyUsed = tickets.stream().anyMatch(t -> TICKET_USED.equalsIgnoreCase(t.getStatus()));
        if (anyUsed) {
            blocked.add("Vé đã được soát, không thể hủy");
        }

        return blocked;
    }

    private RefundCalculation calculateRefund(BigDecimal totalPaid, boolean showtimeCancelled) {
        if (totalPaid == null) {
            totalPaid = BigDecimal.ZERO;
        }
        if (showtimeCancelled && systemConfigService.isFullRefundOnShowtimeCancel()) {
            return new RefundCalculation(BigDecimal.ZERO, totalPaid);
        }
        if (!systemConfigService.isCustomerRefundEnabled()) {
            return new RefundCalculation(totalPaid, BigDecimal.ZERO);
        }
        BigDecimal feePercent = BigDecimal.valueOf(systemConfigService.getCancellationFeePercent());
        BigDecimal fee = totalPaid.multiply(feePercent)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        BigDecimal refund = totalPaid.subtract(fee).max(BigDecimal.ZERO);
        return new RefundCalculation(fee, refund);
    }

    private List<RefundStatusResponse.RefundTimelineItem> buildTimeline(Refund refund) {
        List<RefundStatusResponse.RefundTimelineItem> timeline = new ArrayList<>();
        timeline.add(new RefundStatusResponse.RefundTimelineItem("REQUESTED", "Yêu cầu hủy vé",
                refund.getCreatedAt()));
        if (RefundStatus.PENDING.name().equals(refund.getStatus())) {
            timeline.add(new RefundStatusResponse.RefundTimelineItem("PENDING", "Chờ admin duyệt hoàn tiền",
                    refund.getUpdatedAt()));
        }
        if (RefundStatus.PROCESSING.name().equals(refund.getStatus())
                || RefundStatus.COMPLETED.name().equals(refund.getStatus())) {
            timeline.add(new RefundStatusResponse.RefundTimelineItem("PROCESSING", "Đang xử lý hoàn tiền",
                    refund.getUpdatedAt()));
        }
        if (RefundStatus.COMPLETED.name().equals(refund.getStatus())) {
            timeline.add(new RefundStatusResponse.RefundTimelineItem("COMPLETED", "Hoàn tiền thành công",
                    refund.getCompletedAt()));
        }
        if (RefundStatus.FAILED.name().equals(refund.getStatus())) {
            timeline.add(new RefundStatusResponse.RefundTimelineItem("FAILED", "Hoàn tiền thất bại",
                    refund.getUpdatedAt()));
        }
        return timeline;
    }

    private int calculateScore(BigDecimal price) {
        if (price == null) {
            return 0;
        }
        return price.divide(BigDecimal.valueOf(10000), 0, RoundingMode.DOWN).intValue();
    }

    private String formatMoney(BigDecimal amount) {
        return new java.text.DecimalFormat("#,###").format(amount) + "đ";
    }

    private boolean isOnlineBooking(Booking booking) {
        return booking != null && ("ONLINE".equalsIgnoreCase(booking.getBookingType())
                || isOnlineBookingLabel(booking));
    }

    private boolean isOnlineBookingLabel(Booking booking) {
        if (booking == null || booking.getShowtimeUuid() != null) {
            return false;
        }
        return booking.getMovieUuid() != null;
    }

    private void restorePromotionAndVoucher(Booking booking) {
        if (booking.getPromotionUuid() != null) {
            promotionRepository.findByIdForUpdate(booking.getPromotionUuid()).ifPresent(promotion -> {
                int used = promotion.getUsedCount() != null ? promotion.getUsedCount() : 0;
                if (used > 0) {
                    promotion.setUsedCount(used - 1);
                    promotionRepository.save(promotion);
                }
            });
        }
        voucherRedemptionService.releaseVoucherForBooking(booking.getUuid());
    }

    private record RefundCalculation(BigDecimal fee, BigDecimal refundAmount) {
    }

    private TransactionTemplate requiresNewTransaction() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return transaction;
    }

    private record RefundExecutionContext(
            UUID refundUuid,
            UUID bookingUuid,
            UUID userUuid,
            UUID paymentUuid,
            String paymentMethod,
            String gatewayTransactionId,
            BigDecimal amount,
            String idempotencyKey) {
    }
}
