package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.Payment;
import com.thdpv.movietheater.booking.entity.Refund;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.PaymentRepository;
import com.thdpv.movietheater.booking.repository.RefundRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.payment.dto.WalletSummaryResponse;
import com.thdpv.movietheater.payment.dto.WalletTopUpIntentResponse;
import com.thdpv.movietheater.payment.dto.WalletTransactionResponse;
import com.thdpv.movietheater.payment.dto.VietQRGenerateResponse;
import com.thdpv.movietheater.payment.entity.PaymentTransaction;
import com.thdpv.movietheater.payment.entity.VietQRWebhookTransaction;
import com.thdpv.movietheater.payment.entity.WalletTransaction;
import com.thdpv.movietheater.payment.repository.PaymentTransactionRepository;
import com.thdpv.movietheater.payment.repository.VietQRWebhookTransactionRepository;
import com.thdpv.movietheater.payment.repository.WalletTransactionRepository;
import com.thdpv.movietheater.payment.stripe.application.port.StripeGateway;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentInput;
import com.thdpv.movietheater.payment.stripe.domain.PaymentIntentResult;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class WalletService {

    private static final int WALLET_WRITE_RETRIES = 4;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public static final String TYPE_TOP_UP = "TOP_UP";
    public static final String TYPE_WITHDRAW = "WITHDRAW";
    public static final String TYPE_PAYMENT = "PAYMENT";
    public static final String TYPE_REFUND = "REFUND";

    public static final String PURPOSE_WALLET_TOP_UP = "WALLET_TOP_UP";
    public static final String PURPOSE_BOOKING = "BOOKING";

    private final UserRepository userRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final StripeGateway stripeGateway;
    private final VietQRService vietQRService;
    private final VietQRWebhookTransactionRepository vietQRWebhookRepo;

    @Value("${app.wallet.top-up-provider:mock}")
    private String topUpProvider;

    @Value("${app.wallet.default-balance:1000000}")
    private BigDecimal defaultBalance;

    @Value("${app.wallet.seed-demo-balance:false}")
    private boolean seedDemoBalance;

    @Value("${app.wallet.min-top-up:10000}")
    private BigDecimal minTopUp;

    @Value("${app.wallet.max-top-up:10000000}")
    private BigDecimal maxTopUp;

    @Value("${app.wallet.quick-amounts:100000,200000,500000,1000000}")
    private String quickAmountsConfig;

    public WalletService(
            UserRepository userRepository,
            WalletTransactionRepository walletTransactionRepository,
            RefundRepository refundRepository,
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            MovieRepository movieRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            StripeGateway stripeGateway,
            VietQRService vietQRService,
            VietQRWebhookTransactionRepository vietQRWebhookRepo) {
        this.userRepository = userRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.refundRepository = refundRepository;
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.movieRepository = movieRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.stripeGateway = stripeGateway;
        this.vietQRService = vietQRService;
        this.vietQRWebhookRepo = vietQRWebhookRepo;
    }

    public boolean isMockTopUp() {
        return "mock".equalsIgnoreCase(topUpProvider);
    }

    @Transactional(readOnly = true)
    public WalletSummaryResponse getSummary(UUID userUuid) {
        User user = findUser(userUuid);
        ensureWalletInitialized(user);

        WalletSummaryResponse response = new WalletSummaryResponse();
        response.setBalance(user.getWalletBalance());
        response.setProvider(topUpProvider);
        response.setMockMode(isMockTopUp());
        response.setMinTopUp(minTopUp);
        response.setMaxTopUp(maxTopUp);
        response.setQuickAmounts(parseQuickAmounts());
        response.setRecentTransactions(getRecentTransactions(userUuid));
        return response;
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> getRecentTransactions(UUID userUuid) {
        return walletTransactionRepository.findTop20ByUserUuidOrderByCreatedAtDesc(userUuid).stream()
                .map(this::mapTransaction)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getTransactions(
            UUID userUuid, String type, LocalDate date, Pageable pageable) {
        String normalizedType = type != null && !type.isBlank()
                ? type.trim().toUpperCase()
                : null;

        if (date != null) {
            OffsetDateTime start = date.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
            OffsetDateTime end = date.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
            if (normalizedType != null) {
                return walletTransactionRepository
                        .findByUserUuidAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                                userUuid, normalizedType, start, end, pageable)
                        .map(this::mapTransaction);
            }
            return walletTransactionRepository
                    .findByUserUuidAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                            userUuid, start, end, pageable)
                    .map(this::mapTransaction);
        }

        if (normalizedType != null) {
            return walletTransactionRepository
                    .findByUserUuidAndTypeOrderByCreatedAtDesc(userUuid, normalizedType, pageable)
                    .map(this::mapTransaction);
        }

        return walletTransactionRepository.findByUserUuidOrderByCreatedAtDesc(userUuid, pageable)
                .map(this::mapTransaction);
    }

    @Transactional
    public WalletSummaryResponse mockTopUp(UUID userUuid, BigDecimal amount) {
        if (!isMockTopUp()) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Chế độ mock đã tắt. Vui lòng nạp qua Stripe (tạo intent rồi xác nhận).");
        }
        validateAmount(amount);
        ensureWalletInitialized(findUser(userUuid));
        runWalletWriteWithRetry(userUuid, user -> credit(user, amount, null, "Nạp tiền mô phỏng (Mock Gateway)"));
        return getSummary(userUuid);
    }

    @Transactional
    public WalletTopUpIntentResponse createTopUpIntent(UUID userUuid, BigDecimal amount) {
        validateAmount(amount);
        ensureWalletInitialized(findUser(userUuid));

        if (isMockTopUp()) {
            mockTopUp(userUuid, amount);
            return new WalletTopUpIntentResponse(null, null, "succeeded", amount.longValue(), "vnd", true);
        }

        long amountVnd = amount.longValue();
        PaymentIntentInput input = new PaymentIntentInput(amountVnd, "vnd");
        input.putMetadata("purpose", PURPOSE_WALLET_TOP_UP);
        input.putMetadata("userUuid", userUuid.toString());

        PaymentIntentResult result;
        try {
            result = stripeGateway.createPaymentIntent(input);
        } catch (RuntimeException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Không tạo được phiên thanh toán Stripe. Kiểm tra cấu hình khóa API.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        PaymentTransaction tx = new PaymentTransaction();
        tx.setUuid(UUID.randomUUID());
        tx.setUserUuid(userUuid);
        tx.setPaymentGateway("STRIPE");
        tx.setGatewayTransactionId(result.getId());
        tx.setAmount(amount);
        tx.setCurrency("VND");
        tx.setStatus("PENDING");
        tx.setPurpose(PURPOSE_WALLET_TOP_UP);
        tx.setCreatedAt(now);
        tx.setUpdatedAt(now);
        paymentTransactionRepository.save(tx);

        return new WalletTopUpIntentResponse(
                result.getId(),
                result.getClientSecret(),
                result.getStatus(),
                amountVnd,
                "vnd",
                false);
    }

    @Transactional
    public WalletSummaryResponse confirmTopUp(UUID userUuid, String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "paymentIntentId là bắt buộc");
        }
        PaymentTransaction tx = paymentTransactionRepository.findByGatewayTransactionId(paymentIntentId.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch nạp tiền"));

        if (!PURPOSE_WALLET_TOP_UP.equals(tx.getPurpose())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Giao dịch không phải nạp ví");
        }
        if (tx.getUserUuid() == null || !tx.getUserUuid().equals(userUuid)) {
            throw new AppException(ErrorCode.FORBIDDEN, "Giao dịch không thuộc tài khoản của bạn");
        }

        PaymentIntentResult stripePi;
        try {
            stripePi = stripeGateway.retrievePaymentIntent(paymentIntentId.trim());
        } catch (RuntimeException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không xác minh được thanh toán Stripe");
        }
        if (!"succeeded".equalsIgnoreCase(stripePi.getStatus())) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Thanh toán chưa hoàn tất (status=" + stripePi.getStatus() + ")");
        }

        applySuccessfulTopUp(tx);
        return getSummary(userUuid);
    }

    /**
     * Idempotent credit after Stripe webhook / confirm. Safe to call multiple times.
     */
    @Transactional
    public void creditSuccessfulStripeTopUp(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return;
        }
        paymentTransactionRepository.findByGatewayTransactionId(paymentIntentId.trim()).ifPresent(tx -> {
            if (!PURPOSE_WALLET_TOP_UP.equals(tx.getPurpose())) {
                return;
            }
            applySuccessfulTopUp(tx);
        });
    }

    private void applySuccessfulTopUp(PaymentTransaction tx) {
        if (walletTransactionRepository.existsByReferenceUuid(tx.getUuid())) {
            if (!"SUCCESS".equalsIgnoreCase(tx.getStatus())) {
                tx.setStatus("SUCCESS");
                tx.setUpdatedAt(OffsetDateTime.now());
                paymentTransactionRepository.save(tx);
            }
            return;
        }

        UUID userUuid = tx.getUserUuid();
        if (userUuid == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Giao dịch nạp ví thiếu userUuid");
        }
        BigDecimal amount = tx.getAmount();
        ensureWalletInitialized(findUser(userUuid));
        runWalletWriteWithRetry(userUuid, user ->
                credit(user, amount, tx.getUuid(), "Nạp tiền qua Stripe · " + tx.getGatewayTransactionId()));

        tx.setStatus("SUCCESS");
        tx.setUpdatedAt(OffsetDateTime.now());
        paymentTransactionRepository.save(tx);
    }

    /**
     * Tạo mã QR VietQR để nạp tiền vào ví. Lưu PaymentTransaction với gateway=VIETQR
     * để tracking; credit sẽ được thực hiện khi checkAndCreditVietQRTopUp() polling thành công.
     */
    @Transactional
    public VietQRGenerateResponse createVietQRTopUp(UUID userUuid, BigDecimal amount) {
        validateAmount(amount);
        ensureWalletInitialized(findUser(userUuid));

        long amountVnd = amount.longValue();
        VietQRGenerateResponse qrData = vietQRService.generateQR(amountVnd, "WALLET TOPUP");

        OffsetDateTime now = OffsetDateTime.now();
        PaymentTransaction tx = new PaymentTransaction();
        tx.setUuid(UUID.randomUUID());
        tx.setUserUuid(userUuid);
        tx.setPaymentGateway("VIETQR");
        tx.setGatewayTransactionId(qrData.getTransferCode());
        tx.setAmount(amount);
        tx.setCurrency("VND");
        tx.setStatus("PENDING");
        tx.setPurpose(PURPOSE_WALLET_TOP_UP);
        tx.setCreatedAt(now);
        tx.setUpdatedAt(now);
        paymentTransactionRepository.save(tx);

        return qrData;
    }

    /**
     * Polling endpoint: kiểm tra webhook VietQR đã nhận chưa.
     * Nếu có → credit ví, đánh dấu giao dịch USED và trả về WalletSummaryResponse.
     * Trả về null nếu chưa có giao dịch phù hợp.
     */
    @Transactional
    public WalletSummaryResponse checkAndCreditVietQRTopUp(UUID userUuid, String transferCode, BigDecimal amount) {
        if (transferCode == null || transferCode.isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "transferCode là bắt buộc");
        }

        // Tìm PaymentTransaction được tạo khi gọi createVietQRTopUp
        PaymentTransaction pendingTx = paymentTransactionRepository
                .findByGatewayTransactionId(transferCode.trim())
                .orElse(null);

        if (pendingTx == null || !PURPOSE_WALLET_TOP_UP.equals(pendingTx.getPurpose())
                || !"VIETQR".equals(pendingTx.getPaymentGateway())) {
            throw new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch nạp ví VietQR");
        }
        if (!userUuid.equals(pendingTx.getUserUuid())) {
            throw new AppException(ErrorCode.FORBIDDEN, "Giao dịch không thuộc tài khoản của bạn");
        }

        // Đã credit trước đó (idempotent)
        if ("SUCCESS".equalsIgnoreCase(pendingTx.getStatus())) {
            return getSummary(userUuid);
        }

        // Kiểm tra webhook VietQR đã nhận chưa
        java.util.List<VietQRWebhookTransaction> matches =
                vietQRWebhookRepo.findMatchingUnusedTransaction(transferCode.trim(), amount);
        if (matches.isEmpty()) {
            return null; // Chưa có giao dịch — FE tiếp tục polling
        }

        // Credit ví
        ensureWalletInitialized(findUser(userUuid));
        BigDecimal creditAmount = pendingTx.getAmount();
        runWalletWriteWithRetry(userUuid, user ->
                credit(user, creditAmount, pendingTx.getUuid(), "Nạp tiền qua VietQR · " + transferCode));

        // Đánh dấu PaymentTransaction thành công
        pendingTx.setStatus("SUCCESS");
        pendingTx.setUpdatedAt(OffsetDateTime.now());
        paymentTransactionRepository.save(pendingTx);

        // Đánh dấu webhook transaction USED (lấy record đầu tiên khớp)
        VietQRWebhookTransaction webhookTx = matches.get(0);
        webhookTx.setStatus("USED");
        vietQRWebhookRepo.save(webhookTx);

        return getSummary(userUuid);
    }

    @Transactional
    public WalletSummaryResponse mockWithdraw(UUID userUuid, BigDecimal amount) {
        if (!isMockTopUp()) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Rút tiền mô phỏng chỉ khả dụng khi app.wallet.top-up-provider=mock");
        }
        validateAmount(amount);
        ensureWalletInitialized(findUser(userUuid));
        runWalletWriteWithRetry(userUuid, user -> debit(user, amount, null, "Rút tiền mô phỏng (Mock Gateway)"));
        return getSummary(userUuid);
    }

    @Transactional
    public void debitForPayment(UUID userUuid, BigDecimal amount, UUID paymentUuid, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        ensureWalletInitialized(findUser(userUuid));
        runWalletWriteWithRetry(userUuid, user ->
                debit(user, amount, paymentUuid, description != null ? description : "Thanh toán đặt vé"));
    }

    @Transactional
    public void creditRefund(UUID userUuid, BigDecimal amount, UUID refundUuid, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (refundUuid != null && walletTransactionRepository.existsByReferenceUuid(refundUuid)) {
            return;
        }
        ensureWalletInitialized(findUser(userUuid));
        runWalletWriteWithRetry(userUuid, user ->
                credit(user, amount, refundUuid, description != null ? description : "Hoàn tiền hủy vé"));
    }

    private void debit(User user, BigDecimal amount, UUID referenceUuid, String description) {
        BigDecimal balance = user.getWalletBalance() != null ? user.getWalletBalance() : BigDecimal.ZERO;
        if (balance.compareTo(amount) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số dư ví không đủ. Vui lòng nạp thêm tiền.");
        }
        BigDecimal nextBalance = balance.subtract(amount);
        user.setWalletBalance(nextBalance);
        userRepository.save(user);
        String type = description != null && description.toLowerCase().contains("rút")
                ? TYPE_WITHDRAW
                : TYPE_PAYMENT;
        recordTransaction(user.getId(), type, amount.negate(), nextBalance, referenceUuid, description);
    }

    private void credit(User user, BigDecimal amount, UUID referenceUuid, String description) {
        BigDecimal balance = user.getWalletBalance() != null ? user.getWalletBalance() : BigDecimal.ZERO;
        BigDecimal nextBalance = balance.add(amount);
        user.setWalletBalance(nextBalance);
        userRepository.save(user);
        String type = description != null && description.toLowerCase().contains("hoàn")
                ? TYPE_REFUND
                : TYPE_TOP_UP;
        recordTransaction(user.getId(), type, amount, nextBalance, referenceUuid, description);
    }

    private void recordTransaction(UUID userUuid, String type, BigDecimal signedAmount, BigDecimal balanceAfter,
            UUID referenceUuid, String description) {
        OffsetDateTime now = OffsetDateTime.now();
        WalletTransaction tx = new WalletTransaction();
        tx.setUuid(UUID.randomUUID());
        tx.setUserUuid(userUuid);
        tx.setType(type);
        tx.setAmount(signedAmount);
        tx.setBalanceAfter(balanceAfter);
        tx.setReferenceUuid(referenceUuid);
        tx.setDescription(description);
        tx.setCreatedAt(now);
        walletTransactionRepository.save(tx);
    }

    private void ensureWalletInitialized(User user) {
        if (user.getWalletBalance() == null) {
            user.setWalletBalance(BigDecimal.ZERO);
            userRepository.save(user);
        }
        if (!seedDemoBalance) {
            return;
        }
        boolean hasTransactions = !walletTransactionRepository
                .findTop20ByUserUuidOrderByCreatedAtDesc(user.getId())
                .isEmpty();
        if (!hasTransactions && user.getWalletBalance().compareTo(BigDecimal.ZERO) == 0) {
            runWalletWriteWithRetry(user.getId(), loaded -> credit(loaded, defaultBalance, null, "Số dư khởi tạo demo"));
        }
    }

    private void validateAmount(BigDecimal amount) {
        BigDecimal min = minTopUp != null ? minTopUp : BigDecimal.valueOf(10_000);
        if (amount == null || amount.compareTo(min) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST,
                    "Số tiền tối thiểu là " + min.toPlainString() + "đ");
        }
        if (maxTopUp != null && amount.compareTo(maxTopUp) > 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền vượt quá giới hạn cho phép");
        }
    }

    private List<BigDecimal> parseQuickAmounts() {
        if (quickAmountsConfig == null || quickAmountsConfig.isBlank()) {
            return List.of();
        }
        return Arrays.stream(quickAmountsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(BigDecimal::new)
                .collect(Collectors.toList());
    }

    private User findUser(UUID userUuid) {
        if (userUuid == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy người dùng"));
    }

    @FunctionalInterface
    private interface WalletMutation {
        void apply(User user);
    }

    private void runWalletWriteWithRetry(UUID userUuid, WalletMutation mutation) {
        for (int attempt = 0; attempt < WALLET_WRITE_RETRIES; attempt++) {
            User user = findUser(userUuid);
            if (user.getWalletBalance() == null) {
                user.setWalletBalance(BigDecimal.ZERO);
            }
            try {
                mutation.apply(user);
                return;
            } catch (ObjectOptimisticLockingFailureException ex) {
                if (attempt == WALLET_WRITE_RETRIES - 1) {
                    throw new AppException(ErrorCode.CONFLICT, "Giao dịch ví đang bận, vui lòng thử lại.");
                }
            }
        }
    }

    private WalletTransactionResponse mapTransaction(WalletTransaction tx) {
        WalletTransactionResponse response = new WalletTransactionResponse();
        response.setUuid(tx.getUuid());
        response.setType(tx.getType());
        response.setAmount(tx.getAmount());
        response.setBalanceAfter(tx.getBalanceAfter());
        response.setDescription(tx.getDescription());
        response.setReferenceUuid(tx.getReferenceUuid());
        response.setCreatedAt(tx.getCreatedAt());
        resolveBookingContext(tx).ifPresent(ctx -> {
            response.setBookingUuid(ctx.bookingUuid());
            response.setMovieTitle(ctx.movieTitle());
        });
        return response;
    }

    private java.util.Optional<BookingContext> resolveBookingContext(WalletTransaction tx) {
        if (tx.getReferenceUuid() == null) {
            return java.util.Optional.empty();
        }
        UUID bookingUuid = null;
        String type = tx.getType() != null ? tx.getType().toUpperCase() : "";
        if (TYPE_REFUND.equals(type)) {
            bookingUuid = refundRepository.findById(tx.getReferenceUuid())
                    .map(Refund::getBookingUuid)
                    .orElse(null);
        } else if (TYPE_PAYMENT.equals(type)) {
            bookingUuid = paymentRepository.findById(tx.getReferenceUuid())
                    .map(Payment::getBookingUuid)
                    .orElse(null);
        }
        if (bookingUuid == null) {
            return java.util.Optional.empty();
        }
        Booking booking = bookingRepository.findById(bookingUuid).orElse(null);
        if (booking == null) {
            return java.util.Optional.of(new BookingContext(bookingUuid, null));
        }
        String movieTitle = null;
        if (booking.getMovieUuid() != null) {
            movieTitle = movieRepository.findById(booking.getMovieUuid()).map(Movie::getTitle).orElse(null);
        }
        return java.util.Optional.of(new BookingContext(bookingUuid, movieTitle));
    }

    private record BookingContext(UUID bookingUuid, String movieTitle) {
    }
}
