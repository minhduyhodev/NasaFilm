package com.thdpv.movietheater.movie.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.cache.MovieReviewCacheEvictor;
import com.thdpv.movietheater.config.service.SystemConfigService;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.movie.dto.request.CreateMovieReviewRequest;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewReportRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.movie.support.ReviewActionRateLimiter;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class MovieReviewServiceTest {

    @Mock
    private MovieReviewRepository movieReviewRepository;
    @Mock
    private MovieReviewReportRepository movieReviewReportRepository;
    @Mock
    private MovieRepository movieRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private SystemConfigService systemConfigService;
    @Mock
    private MovieReviewStatsService movieReviewStatsService;
    @Mock
    private MovieReviewCacheEvictor movieReviewCacheEvictor;
    @Mock
    private ReviewActionRateLimiter reviewActionRateLimiter;
    @Mock
    private ReviewVibeTagService reviewVibeTagService;
    @Mock
    private MissionService missionService;

    @InjectMocks
    private MovieReviewService movieReviewService;

    private UUID movieUuid;
    private UUID userUuid;
    private User user;

    @BeforeEach
    void setUp() {
        movieUuid = UUID.randomUUID();
        userUuid = UUID.randomUUID();
        user = new User();
        user.setId(userUuid);

        Movie movie = new Movie();
        movie.setUuid(movieUuid);
        movie.setStatus("NOW_SHOWING");
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(movie));
        when(userRepository.findByEmailIgnoreCase("viewer@example.com")).thenReturn(Optional.of(user));
        when(bookingRepository.hasConfirmedPurchaseForMovie(userUuid, movieUuid)).thenReturn(true);
    }

    @Test
    void createReview_rejectsSecondReviewForSameMovieAndUser() {
        MovieReview existing = new MovieReview();
        when(movieReviewRepository.findByMovieUuidAndUserUuid(movieUuid, userUuid))
                .thenReturn(Optional.of(existing));

        AppException exception = assertThrows(
                AppException.class,
                () -> movieReviewService.createReview(
                        movieUuid, reviewRequest(5, "Hay", List.of()), "viewer@example.com"));

        assertEquals(ErrorCode.REVIEW_ALREADY_EXISTS, exception.getErrorCode());
        verify(movieReviewRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    private CreateMovieReviewRequest reviewRequest(int rating, String comment, List<String> vibeTags) {
        CreateMovieReviewRequest request = new CreateMovieReviewRequest();
        request.setRating(rating);
        request.setComment(comment);
        request.setVibeTags(vibeTags);
        return request;
    }
}
