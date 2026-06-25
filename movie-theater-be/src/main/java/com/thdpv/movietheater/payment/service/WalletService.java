package com.thdpv.movietheater.payment.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
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
import com.thdpv.movietheater.payment.dto.WalletTransactionResponse;
import com.thdpv.movietheater.payment.entity.WalletTransaction;
import com.thdpv.movietheater.payment.repository.WalletTransactionRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class WalletService {

    public static final String TYPE_TOP_UP = "TOP_UP";
    public static final String TYPE_WITHDRAW = "WITHDRAW";
    public static final String TYPE_PAYMENT = "PAYMENT";
    public static final String TYPE_REFUND = "REFUND";

    private final UserRepository userRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;

    @Value("${app.payment.provider:mock}")
    private String paymentProvider;

    @Value("${app.wallet.default-balance:1000000}")
    private BigDecimal defaultBalance;

    @Value("${app.wallet.max-top-up:10000000}")
    private BigDecimal maxTopUp;

    public WalletService(
            UserRepository userRepository,
            WalletTransactionRepository walletTransactionRepository,
            RefundRepository refundRepository,
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            MovieRepository movieRepository) {
        this.userRepository = userRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.refundRepository = refundRepository;
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.movieRepository = movieRepository;
    }

    @Transactional(readOnly = true)
    public WalletSummaryResponse getSummary(UUID userUuid) {
        User user = requireUser(userUuid);
        ensureWalletInitialized(user);

        WalletSummaryResponse response = new WalletSummaryResponse();
        response.setBalance(user.getWalletBalance());
        response.setProvider(paymentProvider);
        response.setMockMode("mock".equalsIgnoreCase(paymentProvider));
        response.setRecentTransactions(getRecentTransactions(userUuid));
        return response;
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> getRecentTransactions(UUID userUuid) {
        return walletTransactionRepository.findTop20ByUserUuidOrderByCreatedAtDesc(userUuid).stream()
                .map(this::mapTransaction)
                .collect(Collectors.toList());
    }

    @Transactional
    public WalletSummaryResponse mockTopUp(UUID userUuid, BigDecimal amount) {
        validateAmount(amount);
        User user = requireUser(userUuid);
        ensureWalletInitialized(user);
        credit(user, amount, null, "Nạp tiền mô phỏng (Mock Gateway)");
        return getSummary(userUuid);
    }

    @Transactional
    public WalletSummaryResponse mockWithdraw(UUID userUuid, BigDecimal amount) {
        validateAmount(amount);
        User user = requireUser(userUuid);
        ensureWalletInitialized(user);
        debit(user, amount, null, "Rút tiền mô phỏng (Mock Gateway)");
        return getSummary(userUuid);
    }

    @Transactional
    public void debitForPayment(UUID userUuid, BigDecimal amount, UUID paymentUuid, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        User user = requireUser(userUuid);
        ensureWalletInitialized(user);
        debit(user, amount, paymentUuid, description != null ? description : "Thanh toán đặt vé");
    }

    @Transactional
    public void creditRefund(UUID userUuid, BigDecimal amount, UUID refundUuid, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        User user = requireUser(userUuid);
        ensureWalletInitialized(user);
        credit(user, amount, refundUuid, description != null ? description : "Hoàn tiền hủy vé");
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
        boolean hasTransactions = !walletTransactionRepository
                .findTop20ByUserUuidOrderByCreatedAtDesc(user.getId())
                .isEmpty();
        if (!hasTransactions && user.getWalletBalance().compareTo(BigDecimal.ZERO) == 0) {
            credit(user, defaultBalance, null, "Số dư khởi tạo demo");
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.valueOf(10_000)) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền tối thiểu là 10.000đ");
        }
        if (maxTopUp != null && amount.compareTo(maxTopUp) > 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Số tiền vượt quá giới hạn cho phép");
        }
    }

    private User requireUser(UUID userUuid) {
        if (userUuid == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy người dùng"));
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
