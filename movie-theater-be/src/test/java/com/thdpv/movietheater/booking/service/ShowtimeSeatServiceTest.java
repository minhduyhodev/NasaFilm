package com.thdpv.movietheater.booking.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest;
import com.thdpv.movietheater.booking.dto.response.ShowtimeSeatMapResponse;
import com.thdpv.movietheater.booking.dto.response.SeatViewDto;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.cinema.enums.SeatStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

@ExtendWith(MockitoExtension.class)
class ShowtimeSeatServiceTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShowtimeRepository showtimeRepository;

    @Mock
    private BookingNativeRepository bookingRepository;

    @InjectMocks
    private ShowtimeSeatService showtimeSeatService;

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
        ReflectionTestUtils.setField(showtimeSeatService, "entityManager", entityManager);
        ReflectionTestUtils.setField(showtimeSeatService, "autoSlideEnabled", true);
    }

    @Test
    void syncSeatLocksShouldFailIfMoreThan8Seats() {
        List<UUID> seatUuids = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            seatUuids.add(UUID.randomUUID());
        }
        SyncSeatLockRequest request = new SyncSeatLockRequest(showtimeUuid, seatUuids);

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        // autoSlideShowtimeIfPast select query returning empty so it doesn't try to slide showtime
        when(mockQuery.getResultList()).thenReturn(Collections.emptyList());

        AppException exception = assertThrows(AppException.class, () -> {
            showtimeSeatService.syncSeatLocks("customer@example.com", request);
        });

        assertEquals(ErrorCode.BAD_REQUEST, exception.getErrorCode());
        assertEquals("Khong duoc chon qua 8 ghe cho moi lan dat", exception.getMessage());
    }

    @Test
    void getSeatMapShouldProcessGapRuleAndOnlyBlockUserCausedGap() {
        UUID seat1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID seat2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID seat3 = UUID.fromString("00000000-0000-0000-0000-000000000003");

        // Mock autoSlideShowtimeIfPast select query returning empty
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(Collections.emptyList());

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        // Mock SeatViewDto list
        // Row A: seat 1 is AVAILABLE (but selected by user), seat 2 is AVAILABLE, seat 3 is BOOKED/UNAVAILABLE.
        // This leaves seat 2 as a gap. Since seat 1 is selected by user, seat 2 should be marked blocked (blocked=true).
        SeatViewDto row1 = createSeatViewDto(showtimeUuid, seat1, "A", 1, "ACTIVE", false, null);
        SeatViewDto row2 = createSeatViewDto(showtimeUuid, seat2, "A", 2, "ACTIVE", false, null);
        SeatViewDto row3 = createSeatViewDto(showtimeUuid, seat3, "A", 3, "ACTIVE", true, null); // booked

        when(showtimeRepository.getShowtimeSeatViews(eq(showtimeUuid), any())).thenReturn(List.of(row1, row2, row3));

        ShowtimeSeatMapResponse response = showtimeSeatService.getSeatMap(showtimeUuid, List.of(seat1), "customer@example.com");

        // Verify that seat 2 is blocked (blocked = true)
        ShowtimeSeatMapResponse.SeatItem s1 = response.getRows().get(0).getSeats().get(0);
        ShowtimeSeatMapResponse.SeatItem s2 = response.getRows().get(0).getSeats().get(1);
        ShowtimeSeatMapResponse.SeatItem s3 = response.getRows().get(0).getSeats().get(2);

        assertEquals(seat1, s1.getSeatUuid());
        assertEquals(seat2, s2.getSeatUuid());
        assertEquals(seat3, s3.getSeatUuid());

        assertEquals(true, s1.getSelected());
        assertEquals(false, s1.getBlocked());

        assertEquals(false, s2.getSelected());
        assertEquals(true, s2.getBlocked()); // Should be blocked because it's a gap caused by selected seat 1

        assertEquals(false, s3.getSelected());
        assertEquals(false, s3.getBlocked());
    }

    @Test
    void getSeatMapShouldBlockSeatsAtBoundaries() {
        UUID seat1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID seat2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID seat3 = UUID.fromString("00000000-0000-0000-0000-000000000003");

        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(Collections.emptyList());

        when(userRepository.findByEmailIgnoreCase("customer@example.com")).thenReturn(Optional.of(mockUser));

        SeatViewDto row1 = createSeatViewDto(showtimeUuid, seat1, "A", 1, "ACTIVE", false, null);
        SeatViewDto row2 = createSeatViewDto(showtimeUuid, seat2, "A", 2, "ACTIVE", false, null);
        SeatViewDto row3 = createSeatViewDto(showtimeUuid, seat3, "A", 3, "ACTIVE", false, null);

        when(showtimeRepository.getShowtimeSeatViews(eq(showtimeUuid), any())).thenReturn(List.of(row1, row2, row3));

        // When user selects middle seat (seat2)
        ShowtimeSeatMapResponse response = showtimeSeatService.getSeatMap(showtimeUuid, List.of(seat2), "customer@example.com");

        ShowtimeSeatMapResponse.SeatItem s1 = response.getRows().get(0).getSeats().get(0);
        ShowtimeSeatMapResponse.SeatItem s2 = response.getRows().get(0).getSeats().get(1);
        ShowtimeSeatMapResponse.SeatItem s3 = response.getRows().get(0).getSeats().get(2);

        // seat 1 and seat 3 should be blocked because selecting seat 2 leaves them as single gaps at the boundaries!
        assertEquals(true, s1.getBlocked());
        assertEquals(true, s3.getBlocked());
    }
    private SeatViewDto createSeatViewDto(UUID showtimeUuid, UUID seatUuid, String rowName, Integer seatNumber,
            String seatStatus, boolean booked, UUID lockedUserUuid) {
        return new SeatViewDto(
                showtimeUuid,
                UUID.randomUUID(),
                OffsetDateTime.now().plusHours(2),
                OffsetDateTime.now().plusHours(4),
                seatUuid,
                rowName,
                seatNumber,
                SeatStatus.valueOf(seatStatus),
                UUID.randomUUID(),
                "STANDARD",
                BigDecimal.valueOf(80000),
                BigDecimal.ONE,
                booked ? UUID.randomUUID() : null,
                lockedUserUuid,
                null
        );
    }
}
