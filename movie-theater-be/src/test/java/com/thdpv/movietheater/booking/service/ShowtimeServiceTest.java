package com.thdpv.movietheater.booking.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.dto.request.ShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.ShowtimeResponse;
import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.BookingComboRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.booking.repository.BookingSeatRepository;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.booking.repository.TicketRepository;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.common.exception.AppException;
import jakarta.persistence.EntityManager;

@ExtendWith(MockitoExtension.class)
public class ShowtimeServiceTest {

    @Mock
    private ShowtimeRepository showtimeRepository;
    @Mock
    private MovieRepository movieRepository;
    @Mock
    private CinemaRoomRepository cinemaRoomRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingSeatRepository bookingSeatRepository;
    @Mock
    private BookingComboRepository bookingComboRepository;
    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private BookingNativeRepository bookingNativeRepository;
    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private ShowtimeService showtimeService;

    private Movie mockMovie;
    private CinemaRoom mockRoom;
    private Cinema mockCinema;
    private UUID movieUuid;
    private UUID roomUuid;

    @BeforeEach
    void setUp() {
        movieUuid = UUID.randomUUID();
        roomUuid = UUID.randomUUID();

        mockMovie = new Movie();
        mockMovie.setUuid(movieUuid);
        mockMovie.setTitle("Test Movie");
        mockMovie.setDurationMinutes(120);

        mockCinema = new Cinema();
        mockCinema.setName("Landmark Test");

        mockRoom = new CinemaRoom();
        mockRoom.setUuid(roomUuid);
        mockRoom.setName("IMAX Room");
        mockRoom.setCinema(mockCinema);
        mockRoom.setStatus(CinemaRoomStatus.ACTIVE);
    }

    @Test
    void testCreateShowtime_Success() {
        ShowtimeRequest request = new ShowtimeRequest(movieUuid, roomUuid, OffsetDateTime.now().plusDays(1), BigDecimal.valueOf(90000));
        
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(mockMovie));
        when(cinemaRoomRepository.findById(roomUuid)).thenReturn(Optional.of(mockRoom));
        when(showtimeRepository.findOverlappingShowtimes(any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(showtimeRepository.save(any(Showtime.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShowtimeResponse response = showtimeService.createShowtime(request);

        assertNotNull(response);
        assertEquals(ShowtimeStatus.DRAFT, response.getStatus());
        assertEquals("Test Movie", response.getMovieTitle());
        assertEquals("IMAX Room", response.getCinemaRoomName());
        assertEquals(BigDecimal.valueOf(90000), response.getBasePrice());
    }

    @Test
    void testCreateShowtime_OverlappingConflict() {
        ShowtimeRequest request = new ShowtimeRequest(movieUuid, roomUuid, OffsetDateTime.now().plusDays(1), BigDecimal.valueOf(90000));
        
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(mockMovie));
        when(cinemaRoomRepository.findById(roomUuid)).thenReturn(Optional.of(mockRoom));
        
        // Return an existing showtime to trigger overlapping check conflict
        Showtime existingShowtime = new Showtime();
        when(showtimeRepository.findOverlappingShowtimes(any(), any(), any(), any())).thenReturn(Collections.singletonList(existingShowtime));

        assertThrows(AppException.class, () -> showtimeService.createShowtime(request));
    }

    @Test
    void testUpdateShowtimeStatus_ValidTransition() {
        UUID showtimeUuid = UUID.randomUUID();
        Showtime showtime = new Showtime();
        showtime.setUuid(showtimeUuid);
        showtime.setStatus(ShowtimeStatus.DRAFT);
        showtime.setMovieUuid(movieUuid);
        showtime.setCinemaRoomUuid(roomUuid);

        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(showtime));
        when(showtimeRepository.save(any(Showtime.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(mockMovie));
        when(cinemaRoomRepository.findById(roomUuid)).thenReturn(Optional.of(mockRoom));

        ShowtimeResponse response = showtimeService.updateShowtimeStatus(showtimeUuid, ShowtimeStatus.SCHEDULED);

        assertNotNull(response);
        assertEquals(ShowtimeStatus.SCHEDULED, response.getStatus());
    }

    @Test
    void testUpdateShowtimeStatus_InvalidTransition() {
        UUID showtimeUuid = UUID.randomUUID();
        Showtime showtime = new Showtime();
        showtime.setUuid(showtimeUuid);
        showtime.setStatus(ShowtimeStatus.DRAFT);

        when(showtimeRepository.findById(showtimeUuid)).thenReturn(Optional.of(showtime));

        // Attempt invalid state transition (DRAFT directly to OPEN_FOR_BOOKING is invalid in state machine)
        assertThrows(AppException.class, () -> showtimeService.updateShowtimeStatus(showtimeUuid, ShowtimeStatus.OPEN_FOR_BOOKING));
    }
}
