package com.thdpv.movietheater.movie.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.StreamTokenUtils;

@ExtendWith(MockitoExtension.class)
class MediaSecurityServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private MovieRepository movieRepository;

    @InjectMocks
    private MediaSecurityService service;

    @Test
    void allowsTokenOnlyForTheMovieObjectOwnedByItsBooking() {
        String rawToken = "raw-stream-token";
        UUID movieUuid = UUID.randomUUID();
        Booking booking = new Booking();
        booking.setMovieUuid(movieUuid);
        Movie movie = new Movie();
        movie.setUuid(movieUuid);
        movie.setStreamingUrl("movie/paid-feature.mp4");

        when(bookingRepository.findFirstByStreamTokenAndExpiresAtAfter(
                eq(StreamTokenUtils.hash(rawToken)), any(OffsetDateTime.class)))
                .thenReturn(Optional.of(booking));
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(movie));

        assertDoesNotThrow(() -> service.assertVodStreamAllowed("movie/paid-feature.mp4", rawToken));
    }

    @Test
    void rejectsUsingAValidTokenForAnotherMovieObject() {
        String rawToken = "raw-stream-token";
        UUID movieUuid = UUID.randomUUID();
        Booking booking = new Booking();
        booking.setMovieUuid(movieUuid);
        Movie movie = new Movie();
        movie.setStreamingUrl("movie/paid-feature.mp4");

        when(bookingRepository.findFirstByStreamTokenAndExpiresAtAfter(
                eq(StreamTokenUtils.hash(rawToken)), any(OffsetDateTime.class)))
                .thenReturn(Optional.of(booking));
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(movie));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.assertVodStreamAllowed("movie/different-feature.mp4", rawToken));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void rejectsMissingTokenBeforeQueryingTheDatabase() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.assertVodStreamAllowed("movie/paid-feature.mp4", " "));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verify(bookingRepository, never())
                .findFirstByStreamTokenAndExpiresAtAfter(any(), any(OffsetDateTime.class));
    }
}
