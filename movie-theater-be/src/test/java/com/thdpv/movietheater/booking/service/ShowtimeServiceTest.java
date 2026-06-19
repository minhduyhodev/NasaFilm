package com.thdpv.movietheater.booking.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;
import com.thdpv.movietheater.booking.dto.request.ShowtimeRequest;
import com.thdpv.movietheater.booking.dto.response.AutoShowtimePreviewResponse;
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
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieGenre;
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

    @Test
    void testGetAutoShowtimesPreview_DistributesAcrossAllMovies() {
        UUID hotMovieUuid = UUID.randomUUID();
        UUID lowMovieUuid = UUID.randomUUID();
        UUID cinemaUuid = UUID.randomUUID();

        Movie hotMovie = buildMovie(hotMovieUuid, "Hot Action Movie", 9.5, "Hành động");
        Movie lowMovie = buildMovie(lowMovieUuid, "Low Drama Movie", 5.0, "Tài liệu");

        when(movieRepository.findAllById(any())).thenReturn(List.of(hotMovie, lowMovie));
        when(cinemaRoomRepository.findAllById(any())).thenReturn(List.of(mockRoom));
        when(showtimeRepository.findActiveShowtimesInRooms(any(), any(), any())).thenReturn(Collections.emptyList());

        AutoShowtimeRequest request = new AutoShowtimeRequest();
        request.setStartDate(LocalDate.now().plusDays(1));
        request.setEndDate(LocalDate.now().plusDays(1));
        request.setCinemaUuid(cinemaUuid);
        request.setRoomUuids(List.of(roomUuid));
        request.setMovieUuids(List.of(hotMovieUuid, lowMovieUuid));
        request.setStartTime(LocalTime.of(8, 0));
        request.setEndTime(LocalTime.of(23, 30));
        request.setBasePrice(BigDecimal.valueOf(85000));
        request.setVipPrice(BigDecimal.valueOf(120000));
        request.setCouplePrice(BigDecimal.valueOf(160000));
        request.setIntervalMinutes(15);
        request.setTrailerBuffer(10);
        request.setGoldenHourWeight(1.0);
        request.setWeekendWeight(1.0);
        request.setRatingWeight(1.0);
        request.setGenreWeight(1.0);

        List<AutoShowtimePreviewResponse> preview = showtimeService.getAutoShowtimesPreview(request);

        assertFalse(preview.isEmpty(), "Should generate at least one showtime");

        Set<UUID> moviesWithShowtimes = preview.stream()
                .map(AutoShowtimePreviewResponse::getMovieUuid)
                .collect(Collectors.toSet());

        assertTrue(moviesWithShowtimes.contains(hotMovieUuid), "Hot movie should have showtimes");
        assertTrue(moviesWithShowtimes.contains(lowMovieUuid), "Low-rated movie should also have showtimes");
    }

    private Movie buildMovie(UUID uuid, String title, double rating, String genreName) {
        Movie movie = new Movie();
        movie.setUuid(uuid);
        movie.setTitle(title);
        movie.setDurationMinutes(120);
        movie.setRating(rating);

        Genre genre = new Genre();
        genre.setName(genreName);

        MovieGenre movieGenre = new MovieGenre();
        movieGenre.setGenre(genre);

        List<MovieGenre> genres = new ArrayList<>();
        genres.add(movieGenre);
        movie.setMovieGenres(genres);

        return movie;
    }
}
