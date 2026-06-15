package com.thdpv.movietheater.booking.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
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

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

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
    }

    @Test
    void confirmBookingShouldFailIfMoreThan8Seats() {
        List<UUID> seatUuids = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            seatUuids.add(UUID.randomUUID());
        }
        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(), null);

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        AppException exception = assertThrows(AppException.class, () -> {
            bookingService.confirmBooking("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Khong duoc chon qua 8 ghe cho moi lan dat", exception.getMessage());
    }

    @Test
    void confirmBookingShouldFailIfComboQuantityIsZeroOrNegative() {
        List<UUID> seatUuids = List.of(UUID.randomUUID());
        ConfirmBookingRequest.ComboItem invalidCombo = new ConfirmBookingRequest.ComboItem(UUID.randomUUID(), 0);
        ConfirmBookingRequest request = new ConfirmBookingRequest(showtimeUuid, seatUuids, List.of(invalidCombo), null);

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
}
