package com.thdpv.movietheater.preshow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.preshow.enums.PreShowRitualStatus;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class PreShowServiceTest {

    private static final ZoneOffset VN = ZoneOffset.ofHours(7);

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private MovieRepository movieRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private BookingSeatRepository bookingSeatRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PreShowService preShowService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(preShowService, "notifyMinutesBefore", 60);
        ReflectionTestUtils.setField(preShowService, "boardingSoonMinutes", 15);
    }

    @Test
    void resolveRitualStatus_ReturnsExpectedPhases() {
        OffsetDateTime start = OffsetDateTime.of(2026, 7, 1, 20, 0, 0, 0, VN);
        OffsetDateTime end = start.plusHours(2);

        assertEquals(
                PreShowRitualStatus.PREPARE,
                preShowService.resolveRitualStatus(start, end, start.minusMinutes(90)));
        assertEquals(
                PreShowRitualStatus.SOON,
                preShowService.resolveRitualStatus(start, end, start.minusMinutes(45)));
        assertEquals(
                PreShowRitualStatus.BOARDING,
                preShowService.resolveRitualStatus(start, end, start.minusMinutes(10)));
        assertEquals(
                PreShowRitualStatus.SHOWING,
                preShowService.resolveRitualStatus(start, end, start.plusMinutes(5)));
        assertEquals(
                PreShowRitualStatus.COMPLETE,
                preShowService.resolveRitualStatus(start, end, end.plusMinutes(1)));
    }

    @Test
    void buildCrewAssignment_FormatsSingleRowRange() {
        String assignment = preShowService.buildCrewAssignment(List.of("A5", "A6", "A7"));
        assertEquals("Khoang A · Ghế A5–A7", assignment);
    }

    @Test
    void buildCrewAssignment_FormatsSingleSeat() {
        String assignment = preShowService.buildCrewAssignment(List.of("B12"));
        assertEquals("Khoang B · Ghế B12", assignment);
    }

    @Test
    void buildCrewAssignment_ReturnsDashWhenEmpty() {
        assertEquals("—", preShowService.buildCrewAssignment(List.of()));
    }
}
