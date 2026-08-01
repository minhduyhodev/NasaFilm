package com.thdpv.movietheater.booking.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.request.ConfirmOnlineBookingRequest;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.BookingComboRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.LockedSeat;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.SeatGapState;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.booking.repository.PromotionRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.booking.dto.response.VodStatusResponse;
import com.thdpv.movietheater.booking.dto.response.VodPlayResponse;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.service.OrbitRoomService;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private com.thdpv.movietheater.booking.repository.SeatLockedRepository seatLockedRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BookingRepository bookingJpaRepository;

    @Mock
    private BookingSeatRepository bookingSeatRepository;

    @Mock
    private BookingComboRepository bookingComboRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private BookingNativeRepository bookingRepository;

    @Mock
    private ShowtimeRepository showtimeRepository;

    @Mock
    private CinemaRoomRepository cinemaRoomRepository;

    @Mock
    private MovieRepository movieRepository;

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private SystemConfigService systemConfigService;

    @Mock
    private ShowtimeCapacityService showtimeCapacityService;

    @Mock
    private MissionService missionService;

    @Mock
    private SeatGapValidationService seatGapValidationService;

    @Mock
    private OrbitRoomService orbitRoomService;

    @Mock
    private ShowtimeOverlapSupport showtimeOverlapSupport;

    @Mock
    private com.thdpv.movietheater.payment.service.PaymentService paymentService;

    @InjectMocks
    private BookingService bookingService;

    private User mockUser;
    private UUID userUuid;
    private UUID showtimeUuid;

    @BeforeEach
    void setUp() {
        userUuid = UUID.randomUUID();
        showtimeUuid = UUID.randomUUID();
        mockUser = new User();
        mockUser.setId(userUuid);
        mockUser.setEmail("customer@example.com");
        ReflectionTestUtils.setField(bookingService, "autoSlideEnabled", true);
        lenient().when(showtimeOverlapSupport.planSlideIfPast(any(), any())).thenReturn(Optional.empty());
        lenient().when(systemConfigService.getMaxSeatsPerBooking()).thenReturn(8);
        lenient().when(systemConfigService.getOnlineWatchLockMultiplier()).thenReturn(2.0);
        lenient().doNothing().when(showtimeCapacityService)
                .validateCapacity(any(), any(Integer.class), any(), any());
        lenient().when(missionService.handleEvent(any())).thenReturn(List.of());
        lenient().doAnswer(invocation -> {
            new SeatGapValidationService(bookingRepository).validateNoSingleSeatGap(
                    invocation.getArgument(0),
                    invocation.getArgument(1),
                    invocation.getArgument(2));
            return null;
        }).when(seatGapValidationService).validateNoSingleSeatGap(any(), anyCollection(), any());
    }

    @Test
    void confirmBookingShouldFailIfMoreThan8Seats() {
        List<UUID> seatUuids = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            seatUuids.add(UUID.randomUUID());
        }
        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(), null);
        request.setPaymentMethod("wallet");

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Khong duoc chon qua 8 ghe cho moi lan dat", exception.getMessage());
    }

    @Test
    void confirmBookingShouldRejectCounterPaymentMethodFromCustomer() {
        ConfirmBookingRequest request = new ConfirmBookingRequest(
                showtimeUuid, List.of(UUID.randomUUID()), List.of(), null);
        request.setPaymentMethod("COUNTER_CASH");

        AppException exception = assertThrows(AppException.class,
                () -> bookingService.confirmBooking("customer@example.com", request));

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Phương thức thanh toán không hợp lệ", exception.getMessage());
    }

    @Test
    void confirmOnlineBookingShouldRejectCounterPaymentMethodFromCustomer() {
        ConfirmOnlineBookingRequest request = new ConfirmOnlineBookingRequest(UUID.randomUUID(), null);
        request.setPaymentMethod("counter_card");

        AppException exception = assertThrows(AppException.class,
                () -> bookingService.confirmOnlineBooking("customer@example.com", request));

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Phương thức thanh toán không hợp lệ", exception.getMessage());
    }

    @Test
    void confirmBookingShouldFailIfComboQuantityIsZeroOrNegative() {
        List<UUID> seatUuids = List.of(UUID.randomUUID());
        ConfirmBookingRequest.ComboItem invalidCombo = new ConfirmBookingRequest.ComboItem(UUID.randomUUID(), 0);
        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(invalidCombo), null);
        request.setPaymentMethod("wallet");

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("So luong combo phai lon hon 0", exception.getMessage());
    }

    @Test
    void confirmBookingShouldFailIfShowtimeInPast() {
        List<UUID> seatUuids = List.of(UUID.randomUUID());
        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(), null);
        request.setPaymentMethod("wallet");

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Showtime mockShowtime = new Showtime();
        mockShowtime.setUuid(showtimeUuid);
        mockShowtime.setStatus(ShowtimeStatus.OPEN_FOR_BOOKING);
        mockShowtime.setStartTime(OffsetDateTime.now().minusMinutes(5));
        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(mockShowtime));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Suat chieu da bat dau hoac da dien ra, khong the thuc hien", exception.getMessage());
    }

    @Test
    void confirmBookingShouldFailIfUserCausedSingleSeatGap() {
        UUID seat1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID seat2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID seat3 = UUID.fromString("00000000-0000-0000-0000-000000000003");

        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, List.of(seat1), List.of(), null);
        request.setPaymentMethod("wallet");

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Showtime mockShowtime = new Showtime();
        mockShowtime.setUuid(showtimeUuid);
        mockShowtime.setStatus(ShowtimeStatus.OPEN_FOR_BOOKING);
        mockShowtime.setStartTime(OffsetDateTime.now().plusHours(2));
        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(mockShowtime));

        LockedSeat mockLocked = new LockedSeat(seat1, "A", 1, BigDecimal.valueOf(80000));
        when(bookingRepository.lockActiveSeatsForConfirm(eq(showtimeUuid), eq(userUuid), any(), any()))
            .thenReturn(List.of(mockLocked));

        SeatGapState s1 = new SeatGapState(seat1, "A", 1, "ACTIVE", false, false);
        SeatGapState s2 = new SeatGapState(seat2, "A", 2, "ACTIVE", false, false);
        SeatGapState s3 = new SeatGapState(seat3, "A", 3, "ACTIVE", true, false);

        when(bookingRepository.loadSeatGapStates(eq(showtimeUuid), any())).thenReturn(List.of(s1, s2, s3));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Khong duoc de trong 1 ghe le bi kep giua", exception.getMessage());
    }

    @Test
    void confirmBookingShouldFailIfUserCausedSingleSeatGapAtBoundary() {
        UUID seat1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID seat2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID seat3 = UUID.fromString("00000000-0000-0000-0000-000000000003");

        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, List.of(seat2), List.of(), null);
        request.setPaymentMethod("wallet");

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Showtime mockShowtime = new Showtime();
        mockShowtime.setUuid(showtimeUuid);
        mockShowtime.setStatus(ShowtimeStatus.OPEN_FOR_BOOKING);
        mockShowtime.setStartTime(OffsetDateTime.now().plusHours(2));
        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(mockShowtime));

        LockedSeat mockLocked = new LockedSeat(seat2, "A", 2, BigDecimal.valueOf(80000));
        when(bookingRepository.lockActiveSeatsForConfirm(eq(showtimeUuid), eq(userUuid), any(), any()))
            .thenReturn(List.of(mockLocked));

        SeatGapState s1 = new SeatGapState(seat1, "A", 1, "ACTIVE", false, false);
        SeatGapState s2 = new SeatGapState(seat2, "A", 2, "ACTIVE", false, false);
        SeatGapState s3 = new SeatGapState(seat3, "A", 3, "ACTIVE", false, false);

        when(bookingRepository.loadSeatGapStates(eq(showtimeUuid), any())).thenReturn(List.of(s1, s2, s3));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Khong duoc de trong 1 ghe le bi kep giua", exception.getMessage());
    }

    @Test
    void confirmBookingWithOrbitShouldInvokeAssertCheckoutReady() {
        UUID orbitRoomUuid = UUID.randomUUID();
        UUID seatUuid = UUID.randomUUID();
        List<UUID> seatUuids = List.of(seatUuid);

        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(), null);
        request.setPaymentMethod("wallet");
        request.setOrbitRoomUuid(orbitRoomUuid);

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Showtime mockShowtime = new Showtime();
        mockShowtime.setUuid(showtimeUuid);
        mockShowtime.setStatus(ShowtimeStatus.OPEN_FOR_BOOKING);
        mockShowtime.setStartTime(OffsetDateTime.now().plusHours(2));
        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(mockShowtime));

        org.mockito.Mockito.doThrow(new AppException(ErrorCode.BAD_REQUEST, "Phòng Orbit chưa sẵn sàng thanh toán"))
                .when(orbitRoomService)
                .assertCheckoutReady(orbitRoomUuid, userUuid, showtimeUuid, seatUuids);

        AppException exception = assertThrows(AppException.class, () ->
                bookingService.confirmBooking("customer@example.com", request));

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        verify(orbitRoomService).assertCheckoutReady(orbitRoomUuid, userUuid, showtimeUuid, seatUuids);
    }

    @Test
    void getVodStatus_NoBooking_ReturnsNoneState() {
        UUID movieUuid = UUID.randomUUID();
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));
        when(bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", "CONFIRMED")).thenReturn(Optional.empty());

        VodStatusResponse response = bookingService.getVodStatus("customer@example.com", movieUuid);

        assertEquals(false, response.isHasPurchased());
        assertEquals("NONE", response.getPlaybackState());
    }

    @Test
    void activateVodPlay_FirstTime_SetsExpirationAndReturnsToken() {
        UUID movieUuid = UUID.randomUUID();
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Booking booking = new Booking();
        booking.setUuid(UUID.randomUUID());
        booking.setUserUuid(userUuid);
        booking.setMovieUuid(movieUuid);
        booking.setBookingType("ONLINE");
        booking.setStatus("CONFIRMED");

        Movie movie = new Movie();
        movie.setUuid(movieUuid);
        movie.setDurationMinutes(120);
        movie.setStreamingUrl("https://java-06.s3.ap-southeast-1.amazonaws.com/movie/demo-stream.mp4");

        when(bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", "CONFIRMED")).thenReturn(Optional.of(booking));
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(movie));
        when(bookingJpaRepository.claimFirstPlay(
                eq(booking.getUuid()), any(OffsetDateTime.class), any(OffsetDateTime.class),
                any(String.class), any(OffsetDateTime.class))).thenReturn(1);

        VodPlayResponse response = bookingService.activateVodPlay("customer@example.com", movieUuid);

        org.junit.jupiter.api.Assertions.assertNotNull(response.getStreamToken());
        org.junit.jupiter.api.Assertions.assertEquals(
                com.thdpv.movietheater.movie.util.StreamTokenUtils.fingerprint(response.getStreamToken()),
                response.getStreamSessionId());
        org.junit.jupiter.api.Assertions.assertEquals(
                "/api/media/stream?key=movie%2Fdemo-stream.mp4",
                response.getStreamingUrl());
        org.junit.jupiter.api.Assertions.assertNotNull(response.getExpiresAt());
    }

    @Test
    void vodHeartbeat_TokenMismatch_ThrowsConflict() {
        UUID movieUuid = UUID.randomUUID();
        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Booking booking = new Booking();
        booking.setUuid(UUID.randomUUID());
        booking.setUserUuid(userUuid);
        booking.setMovieUuid(movieUuid);
        booking.setBookingType("ONLINE");
        booking.setStatus("CONFIRMED");
        booking.setFirstPlayedAt(OffsetDateTime.now());
        booking.setExpiresAt(OffsetDateTime.now().plusHours(2));
        booking.setStreamToken("token-a");

        when(bookingJpaRepository.findFirstByUserUuidAndMovieUuidAndBookingTypeAndStatusOrderByCreatedAtDesc(
                userUuid, movieUuid, "ONLINE", "CONFIRMED")).thenReturn(Optional.of(booking));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.vodHeartbeat("customer@example.com", movieUuid, "token-b", null, null);
        });

        assertEquals(ErrorCode.CONFLICT, exception.getErrorCode());
        assertEquals("Tài khoản đang được xem trên thiết bị khác", exception.getMessage());
    }

    @Test
    void revokeExpiredVodStreamTokens_DelegatesToRepository() {
        when(bookingJpaRepository.revokeExpiredVodStreamTokens(any(OffsetDateTime.class))).thenReturn(4);

        int count = bookingService.revokeExpiredVodStreamTokens();

        assertEquals(4, count);
        verify(bookingJpaRepository).revokeExpiredVodStreamTokens(any(OffsetDateTime.class));
    }
}
