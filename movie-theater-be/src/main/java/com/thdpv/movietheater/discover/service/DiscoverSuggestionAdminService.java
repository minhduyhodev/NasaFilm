package com.thdpv.movietheater.discover.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverSuggestionRequest;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverSuggestionResponse;
import com.thdpv.movietheater.discover.entity.DiscoverCuratedSuggestion;
import com.thdpv.movietheater.discover.repository.DiscoverCuratedSuggestionRepository;
import com.thdpv.movietheater.movie.dto.response.MovieSummaryResponse;
import com.thdpv.movietheater.movie.service.MovieService;

@Service
public class DiscoverSuggestionAdminService {

    private final DiscoverCuratedSuggestionRepository suggestionRepository;
    private final DiscoverQuizAdminService quizAdminService;
    private final MovieService movieService;

    public DiscoverSuggestionAdminService(
            DiscoverCuratedSuggestionRepository suggestionRepository,
            DiscoverQuizAdminService quizAdminService,
            MovieService movieService) {
        this.suggestionRepository = suggestionRepository;
        this.quizAdminService = quizAdminService;
        this.movieService = movieService;
    }

    @Transactional(readOnly = true)
    public List<AdminDiscoverSuggestionResponse> listSuggestions(String mood, Boolean active) {
        List<DiscoverCuratedSuggestion> suggestions;
        if (mood != null && !mood.isBlank()) {
            String normalizedMood = mood.trim().toUpperCase(Locale.ROOT);
            suggestions = suggestionRepository.findByMoodOrderBySortOrderAsc(normalizedMood);
        } else {
            suggestions = suggestionRepository.findAllByOrderByMoodAscSortOrderAsc();
        }
        if (active != null) {
            suggestions = suggestions.stream()
                    .filter(item -> item.isActive() == active)
                    .toList();
        }
        return toResponses(suggestions);
    }

    @Transactional(readOnly = true)
    public List<DiscoverCuratedSuggestion> findActiveByMood(String mood) {
        if (mood == null || mood.isBlank()) {
            return List.of();
        }
        return suggestionRepository.findByMoodAndActiveTrueOrderBySortOrderAsc(
                mood.trim().toUpperCase(Locale.ROOT));
    }

    @Transactional
    public AdminDiscoverSuggestionResponse upsertSuggestion(AdminDiscoverSuggestionRequest request) {
        String mood = request.getMood().trim().toUpperCase(Locale.ROOT);
        if (!quizAdminService.getActiveKeys("MOOD").contains(mood)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Invalid mood: " + mood);
        }

        List<MovieSummaryResponse> movies = movieService.getMovieSummaries(List.of(request.getMovieUuid()));
        if (movies.isEmpty()) {
            throw new AppException(ErrorCode.MOVIE_NOT_FOUND);
        }

        DiscoverCuratedSuggestion suggestion;
        if (request.getUuid() != null) {
            suggestion = suggestionRepository.findById(request.getUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy gợi ý"));
            suggestionRepository.findByMoodAndMovieUuid(mood, request.getMovieUuid()).ifPresent(existing -> {
                if (!existing.getUuid().equals(suggestion.getUuid())) {
                    throw new AppException(ErrorCode.VALIDATION_FAILED, "Phim đã có trong gợi ý mood này");
                }
            });
        } else {
            if (suggestionRepository.existsByMoodAndMovieUuid(mood, request.getMovieUuid())) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "Phim đã có trong gợi ý mood này");
            }
            suggestion = new DiscoverCuratedSuggestion();
            suggestion.setUuid(UUID.randomUUID());
            suggestion.setCreatedAt(OffsetDateTime.now());
        }

        suggestion.setMood(mood);
        suggestion.setMovieUuid(request.getMovieUuid());
        suggestion.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        suggestion.setActive(Boolean.TRUE.equals(request.getActive()));
        suggestion.setNote(request.getNote() != null && !request.getNote().isBlank()
                ? request.getNote().trim()
                : null);

        DiscoverCuratedSuggestion saved = suggestionRepository.save(suggestion);
        return toResponses(List.of(saved)).get(0);
    }

    @Transactional
    public void deleteSuggestion(UUID uuid) {
        DiscoverCuratedSuggestion suggestion = suggestionRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy gợi ý"));
        suggestionRepository.delete(suggestion);
    }

    private List<AdminDiscoverSuggestionResponse> toResponses(List<DiscoverCuratedSuggestion> suggestions) {
        if (suggestions.isEmpty()) {
            return List.of();
        }
        List<UUID> movieUuids = suggestions.stream()
                .map(DiscoverCuratedSuggestion::getMovieUuid)
                .distinct()
                .toList();
        Map<UUID, MovieSummaryResponse> moviesByUuid = movieService.getMovieSummaries(movieUuids).stream()
                .collect(Collectors.toMap(MovieSummaryResponse::getUuid, Function.identity(), (a, b) -> a));

        return suggestions.stream().map(suggestion -> {
            AdminDiscoverSuggestionResponse response = new AdminDiscoverSuggestionResponse();
            response.setUuid(suggestion.getUuid());
            response.setMood(suggestion.getMood());
            response.setMovieUuid(suggestion.getMovieUuid());
            response.setSortOrder(suggestion.getSortOrder());
            response.setActive(suggestion.isActive());
            response.setNote(suggestion.getNote());
            response.setCreatedAt(suggestion.getCreatedAt());
            MovieSummaryResponse movie = moviesByUuid.get(suggestion.getMovieUuid());
            if (movie != null) {
                response.setMovieTitle(movie.getTitle());
                response.setMoviePosterUrl(movie.getPrimaryMediaUrl());
            }
            return response;
        }).toList();
    }
}
