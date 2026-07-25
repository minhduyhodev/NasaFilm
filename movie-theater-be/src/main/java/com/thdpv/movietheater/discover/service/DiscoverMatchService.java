package com.thdpv.movietheater.discover.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchItemResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchResponse;
import com.thdpv.movietheater.discover.entity.DiscoverCuratedSuggestion;
import com.thdpv.movietheater.discover.support.DiscoverScorer;
import com.thdpv.movietheater.discover.support.DiscoverScorer.ScoreResult;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.service.MovieService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserFavorite;
import com.thdpv.movietheater.user.repository.UserFavoriteRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class DiscoverMatchService {

    private static final int CANDIDATE_PAGE_SIZE = 120;

    private final MovieService movieService;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final DiscoverHistoryService discoverHistoryService;
    private final DiscoverQuizAdminService discoverQuizAdminService;
    private final DiscoverSuggestionAdminService discoverSuggestionAdminService;

    public DiscoverMatchService(
            MovieService movieService,
            MovieRepository movieRepository,
            UserRepository userRepository,
            UserFavoriteRepository userFavoriteRepository,
            DiscoverHistoryService discoverHistoryService,
            DiscoverQuizAdminService discoverQuizAdminService,
            DiscoverSuggestionAdminService discoverSuggestionAdminService) {
        this.movieService = movieService;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.userFavoriteRepository = userFavoriteRepository;
        this.discoverHistoryService = discoverHistoryService;
        this.discoverQuizAdminService = discoverQuizAdminService;
        this.discoverSuggestionAdminService = discoverSuggestionAdminService;
    }

    @Transactional
    public DiscoverMatchResponse match(DiscoverMatchRequest request, String userEmail) {
        validateRequest(request);

        Map<UUID, String> genreNamesByUuid = movieService.getAllGenres().stream()
                .collect(Collectors.toMap(Genre::getUuid, Genre::getName, (left, right) -> left));

        User user = resolveUser(userEmail);
        Set<UUID> favoriteGenreUuids = resolveFavoriteGenreUuids(user);

        MovieFilterRequest filter = new MovieFilterRequest();
        filter.setStatus("NOW_SHOWING");
        filter.setRequireBookableShowtime(true);

        Page<MovieListResponse> candidates = movieService.getMovieList(
                filter,
                PageRequest.of(0, CANDIDATE_PAGE_SIZE));

        if (candidates.isEmpty()) {
            filter.setRequireBookableShowtime(false);
            candidates = movieService.getMovieList(filter, PageRequest.of(0, CANDIDATE_PAGE_SIZE));
        }

        Map<UUID, MovieListResponse> candidatesByUuid = new LinkedHashMap<>();
        for (MovieListResponse movie : candidates.getContent()) {
            candidatesByUuid.put(movie.getUuid(), movie);
        }

        List<ScoredMovie> scored = new ArrayList<>();
        for (MovieListResponse movie : candidates.getContent()) {
            ScoreResult scoreResult = DiscoverScorer.score(
                    movie, request, genreNamesByUuid, favoriteGenreUuids);
            scored.add(new ScoredMovie(movie, scoreResult.score(), scoreResult.reasons()));
        }

        scored.sort(Comparator
                .comparingInt(ScoredMovie::score).reversed()
                .thenComparing(item -> item.movie().getReviewAverageRating() != null
                        ? item.movie().getReviewAverageRating()
                        : item.movie().getRating() != null ? item.movie().getRating() : 0.0,
                        Comparator.reverseOrder()));

        int maxMatches = Math.max(1, discoverQuizAdminService.getMaxMatches());
        hydrateCuratedCandidates(request.getMood(), candidatesByUuid);
        List<DiscoverMatchItemResponse> matches = mergeCuratedWithScored(
                request.getMood(),
                candidatesByUuid,
                scored,
                maxMatches);

        if (matches.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Chưa có phim phù hợp để gợi ý");
        }

        int flightNumber = 100 + Math.floorMod(buildFlightSeed(request, userEmail), 900);
        DiscoverMatchResponse response = new DiscoverMatchResponse();
        response.setFlightCode("NSF-" + flightNumber);
        response.setFlightLabel("Gợi ý #" + flightNumber);
        response.setMatches(matches);
        response.setTotalCandidates(candidates.getNumberOfElements());

        UUID sessionUuid = discoverHistoryService.recordSession(
                user != null ? user.getId() : null,
                request,
                response);
        response.setSessionUuid(sessionUuid);

        return response;
    }

    /**
     * Đảm bảo phim curated có trong map candidate dù không nằm page NOW_SHOWING đầu tiên.
     */
    private void hydrateCuratedCandidates(String mood, Map<UUID, MovieListResponse> candidatesByUuid) {
        List<DiscoverCuratedSuggestion> curated = discoverSuggestionAdminService.findActiveByMood(mood);
        if (curated.isEmpty()) {
            return;
        }
        List<UUID> missing = curated.stream()
                .map(DiscoverCuratedSuggestion::getMovieUuid)
                .filter(uuid -> uuid != null && !candidatesByUuid.containsKey(uuid))
                .distinct()
                .toList();
        if (missing.isEmpty()) {
            return;
        }
        for (MovieListResponse movie : movieService.getMovieListByUuids(missing)) {
            candidatesByUuid.putIfAbsent(movie.getUuid(), movie);
        }
    }

    private List<DiscoverMatchItemResponse> mergeCuratedWithScored(
            String mood,
            Map<UUID, MovieListResponse> candidatesByUuid,
            List<ScoredMovie> scored,
            int maxMatches) {
        List<DiscoverMatchItemResponse> matches = new ArrayList<>();
        Set<UUID> used = new HashSet<>();

        List<DiscoverCuratedSuggestion> curated = discoverSuggestionAdminService.findActiveByMood(mood);
        for (DiscoverCuratedSuggestion suggestion : curated) {
            if (matches.size() >= maxMatches) {
                break;
            }
            MovieListResponse movie = candidatesByUuid.get(suggestion.getMovieUuid());
            if (movie == null || used.contains(movie.getUuid())) {
                continue;
            }
            used.add(movie.getUuid());
            List<String> reasons = new ArrayList<>();
            reasons.add("Gợi ý được chọn bởi NASA FILM");
            if (suggestion.getNote() != null && !suggestion.getNote().isBlank()) {
                reasons.add(suggestion.getNote());
            }
            matches.add(toMatchItem(movie, 100, reasons));
        }

        for (ScoredMovie item : scored) {
            if (matches.size() >= maxMatches) {
                break;
            }
            if (used.contains(item.movie().getUuid())) {
                continue;
            }
            used.add(item.movie().getUuid());
            matches.add(toMatchItem(item.movie(), item.score(), item.reasons()));
        }

        return matches;
    }

    private User resolveUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(userEmail).orElse(null);
    }

    private void validateRequest(DiscoverMatchRequest request) {
        validateEnum("mood", request.getMood(), discoverQuizAdminService.getActiveKeys("MOOD"));
        validateEnum("duration", request.getDuration(), discoverQuizAdminService.getActiveKeys("DURATION"));
        validateEnum("viewingLocation", request.getViewingLocation(), discoverQuizAdminService.getActiveKeys("VIEWING"));
    }

    private void validateEnum(String field, String value, Set<String> allowed) {
        if (value == null || value.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, field + " is required");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Invalid " + field + ": " + value);
        }
    }

    private Set<UUID> resolveFavoriteGenreUuids(User user) {
        if (user == null) {
            return Set.of();
        }
        List<UserFavorite> favorites = userFavoriteRepository.findByUserUuidOrderByCreatedAtDesc(user.getId());
        if (favorites.isEmpty()) {
            return Set.of();
        }
        List<UUID> favoriteMovieUuids = favorites.stream()
                .map(UserFavorite::getMovieUuid)
                .limit(12)
                .toList();
        List<com.thdpv.movietheater.movie.entity.Movie> movies = movieRepository.findAllByIdWithGenres(favoriteMovieUuids);
        Set<UUID> genreUuids = new HashSet<>();
        for (com.thdpv.movietheater.movie.entity.Movie movie : movies) {
            if (movie.getMovieGenres() == null) {
                continue;
            }
            for (MovieGenre movieGenre : movie.getMovieGenres()) {
                if (movieGenre.getGenre() != null) {
                    genreUuids.add(movieGenre.getGenre().getUuid());
                }
            }
        }
        return genreUuids;
    }

    private int buildFlightSeed(DiscoverMatchRequest request, String userEmail) {
        int seed = request.getMood().hashCode()
                ^ request.getDuration().hashCode()
                ^ request.getViewingLocation().hashCode();
        if (request.getGenreUuids() != null) {
            seed ^= request.getGenreUuids().hashCode();
        }
        if (userEmail != null) {
            seed ^= userEmail.hashCode();
        }
        return seed;
    }

    private DiscoverMatchItemResponse toMatchItem(MovieListResponse movie, int score, List<String> reasons) {
        DiscoverMatchItemResponse item = new DiscoverMatchItemResponse();
        item.setUuid(movie.getUuid());
        item.setTitle(movie.getTitle());
        item.setPrimaryMediaUrl(movie.getPrimaryMediaUrl());
        item.setDurationMinutes(movie.getDurationMinutes());
        item.setGenres(movie.getGenres());
        item.setScreeningMode(movie.getScreeningMode());
        item.setRating(movie.getRating());
        item.setReviewAverageRating(movie.getReviewAverageRating());
        item.setReviewCount(movie.getReviewCount());
        item.setBestOnBigScreen(movie.getBestOnBigScreen());
        item.setMatchScore(score);
        item.setReasons(reasons.isEmpty() ? List.of("Phim đang chiếu phù hợp hành trình của bạn") : reasons);
        return item;
    }

    private record ScoredMovie(MovieListResponse movie, int score, List<String> reasons) {
    }
}
