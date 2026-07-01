package com.thdpv.movietheater.radar.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.radar.dto.request.UpdateShowtimeRadarRequest;
import com.thdpv.movietheater.radar.dto.response.ShowtimeRadarPreferenceResponse;
import com.thdpv.movietheater.radar.dto.response.ShowtimeRadarSuggestionResponse;
import com.thdpv.movietheater.radar.entity.ShowtimeRadarAlert;
import com.thdpv.movietheater.radar.entity.ShowtimeRadarPreference;
import com.thdpv.movietheater.radar.repository.ShowtimeRadarAlertRepository;
import com.thdpv.movietheater.radar.repository.ShowtimeRadarPreferenceRepository;
import com.thdpv.movietheater.radar.support.ShowtimeAvailabilityRow;
import com.thdpv.movietheater.radar.support.ShowtimeRadarGenreCodec;
import com.thdpv.movietheater.radar.support.ShowtimeRadarGenreMatcher;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserFavorite;
import com.thdpv.movietheater.user.repository.UserFavoriteRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class ShowtimeRadarService {

    private static final Logger log = LoggerFactory.getLogger(ShowtimeRadarService.class);
    private static final int LOOKAHEAD_HOURS = 48;
    private static final int MAX_SUGGESTIONS = 5;
    private static final int MAX_NOTIFICATIONS_PER_USER = 3;
    private static final int MIN_HEAT_SCORE = 25;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final ShowtimeRadarPreferenceRepository preferenceRepository;
    private final ShowtimeRadarAlertRepository alertRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final UserNotificationService userNotificationService;

    public ShowtimeRadarService(
            ShowtimeRadarPreferenceRepository preferenceRepository,
            ShowtimeRadarAlertRepository alertRepository,
            ShowtimeRepository showtimeRepository,
            MovieRepository movieRepository,
            GenreRepository genreRepository,
            CinemaRoomRepository cinemaRoomRepository,
            UserFavoriteRepository userFavoriteRepository,
            UserRepository userRepository,
            UserNotificationService userNotificationService) {
        this.preferenceRepository = preferenceRepository;
        this.alertRepository = alertRepository;
        this.showtimeRepository = showtimeRepository;
        this.movieRepository = movieRepository;
        this.genreRepository = genreRepository;
        this.cinemaRoomRepository = cinemaRoomRepository;
        this.userFavoriteRepository = userFavoriteRepository;
        this.userRepository = userRepository;
        this.userNotificationService = userNotificationService;
    }

    @Transactional(readOnly = true)
    public ShowtimeRadarPreferenceResponse getPreference(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        ShowtimeRadarPreference preference = preferenceRepository.findByUserUuidAndDeletedAtIsNull(userUuid)
                .orElseGet(() -> defaultPreference(userUuid));
        RadarContext context = loadRadarContext();
        List<ShowtimeRadarSuggestionResponse> suggestions = buildSuggestions(
                userUuid, preference, context, false, true);
        return toResponse(preference, suggestions, context.upcomingShowtimeCount());
    }

    @Transactional
    public ShowtimeRadarPreferenceResponse updatePreference(String userEmail, UpdateShowtimeRadarRequest request) {
        UUID userUuid = resolveUserUuid(userEmail);
        ShowtimeRadarPreference preference = preferenceRepository.findByUserUuid(userUuid)
                .orElseGet(() -> {
                    ShowtimeRadarPreference created = defaultPreference(userUuid);
                    created.setEnabled(false);
                    return created;
                });

        if (preference.isDeleted()) {
            preference.setDeletedAt(null);
        }

        if (request.getEnabled() != null) {
            preference.setEnabled(request.getEnabled());
        }
        if (request.getGenreUuids() != null) {
            preference.setGenreUuids(ShowtimeRadarGenreCodec.encode(request.getGenreUuids()));
        }
        if (request.getTimeSlotStartHour() != null) {
            validateHour(request.getTimeSlotStartHour(), "timeSlotStartHour");
        }
        if (request.getTimeSlotEndHour() != null) {
            validateHour(request.getTimeSlotEndHour(), "timeSlotEndHour");
        }
        preference.setTimeSlotStartHour(request.getTimeSlotStartHour());
        preference.setTimeSlotEndHour(request.getTimeSlotEndHour());
        if (request.getIncludeFavorites() != null) {
            preference.setIncludeFavorites(request.getIncludeFavorites());
        }
        preference.setUpdatedAt(OffsetDateTime.now());
        ShowtimeRadarPreference saved = preferenceRepository.saveAndFlush(preference);
        log.info(
                "Saved showtime radar preference userUuid={} enabled={} genreCount={}",
                userUuid,
                saved.isEnabled(),
                ShowtimeRadarGenreCodec.decode(saved.getGenreUuids()).size());

        RadarContext context = loadRadarContext();
        List<ShowtimeRadarSuggestionResponse> suggestions = buildSuggestions(
                userUuid, preference, context, false, true);
        return toResponse(preference, suggestions, context.upcomingShowtimeCount());
    }

    @Transactional
    public void softDeletePreference(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        ShowtimeRadarPreference preference = preferenceRepository.findByUserUuidAndDeletedAtIsNull(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Chưa có cài đặt Smart Showtime Radar"));
        OffsetDateTime now = OffsetDateTime.now();
        preference.setEnabled(false);
        preference.setDeletedAt(now);
        preference.setUpdatedAt(now);
        preferenceRepository.save(preference);
    }

    @Transactional
    public int softDeleteExpiredAlerts() {
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> expiredShowtimeUuids = showtimeRepository.findExpiredShowtimeUuids(now);
        if (expiredShowtimeUuids.isEmpty()) {
            return 0;
        }
        return alertRepository.softDeleteByShowtimeUuids(expiredShowtimeUuids, now);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeRadarSuggestionResponse> getSuggestions(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        ShowtimeRadarPreference preference = preferenceRepository.findByUserUuidAndDeletedAtIsNull(userUuid)
                .orElseGet(() -> defaultPreference(userUuid));
        return buildSuggestions(userUuid, preference, false, true);
    }

    @Transactional
    public int scanAndNotifyAll() {
        softDeleteExpiredAlerts();

        List<ShowtimeRadarPreference> enabledPreferences = preferenceRepository.findByEnabledTrueAndDeletedAtIsNull();
        if (enabledPreferences.isEmpty()) {
            return 0;
        }

        RadarContext context = loadRadarContext();
        int sentCount = 0;

        for (ShowtimeRadarPreference preference : enabledPreferences) {
            List<ShowtimeRadarSuggestionResponse> suggestions = buildSuggestions(
                    preference.getUserUuid(), preference, context, true, false);
            int sentForUser = 0;
            for (ShowtimeRadarSuggestionResponse suggestion : suggestions) {
                if (sentForUser >= MAX_NOTIFICATIONS_PER_USER) {
                    break;
                }
                if (alertRepository.existsByUserUuidAndShowtimeUuidAndDeletedAtIsNull(
                        preference.getUserUuid(), suggestion.getShowtimeUuid())) {
                    continue;
                }

                String timeLabel = suggestion.getStartTime() != null
                        ? suggestion.getStartTime().format(TIME_FORMAT)
                        : "--:--";
                String title = "Smart Showtime Radar";
                String content = String.format(
                        "%s — Suất %s còn %d ghế tại %s",
                        suggestion.getMovieTitle(),
                        timeLabel,
                        suggestion.getAvailableSeats(),
                        suggestion.getCinemaName());

                userNotificationService.createSystemNotification(
                        preference.getUserUuid(), title, content, "showtime_radar");

                ShowtimeRadarAlert alert = new ShowtimeRadarAlert();
                alert.setUuid(UUID.randomUUID());
                alert.setUserUuid(preference.getUserUuid());
                alert.setShowtimeUuid(suggestion.getShowtimeUuid());
                alert.setNotifiedAt(OffsetDateTime.now());
                alertRepository.save(alert);

                sentCount++;
                sentForUser++;
            }
        }

        if (sentCount > 0) {
            log.info("Showtime Radar scheduler sent {} notification(s)", sentCount);
        }
        return sentCount;
    }

    private List<ShowtimeRadarSuggestionResponse> buildSuggestions(
            UUID userUuid, ShowtimeRadarPreference preference, boolean excludeNotified, boolean previewMode) {
        return buildSuggestions(userUuid, preference, loadRadarContext(), excludeNotified, previewMode);
    }

    private List<ShowtimeRadarSuggestionResponse> buildSuggestions(
            UUID userUuid,
            ShowtimeRadarPreference preference,
            RadarContext context,
            boolean excludeNotified,
            boolean previewMode) {
        if (!previewMode && !preference.isEnabled()) {
            return List.of();
        }

        if (!hasActiveFilters(preference)) {
            return List.of();
        }

        List<UUID> selectedGenres = ShowtimeRadarGenreCodec.decode(preference.getGenreUuids());
        Set<UUID> favoriteMovieUuids = loadFavoriteMovieUuids(userUuid);

        List<ScoredSuggestion> scored = new ArrayList<>();
        for (ShowtimeAvailabilityRow row : context.availabilityRows()) {
            if (row.availableSeats() <= 0) {
                continue;
            }
            if (excludeNotified && alertRepository.existsByUserUuidAndShowtimeUuidAndDeletedAtIsNull(
                    userUuid, row.showtimeUuid())) {
                continue;
            }
            if (!ShowtimeRadarGenreCodec.matchesTimeSlot(
                    row.startTime(), preference.getTimeSlotStartHour(), preference.getTimeSlotEndHour())) {
                continue;
            }

            Movie movie = context.moviesByUuid().get(row.movieUuid());
            if (movie == null) {
                continue;
            }

            Set<UUID> movieGenres = context.genresByMovie().getOrDefault(row.movieUuid(), Set.of());
            boolean genreMatch = !selectedGenres.isEmpty()
                    && ShowtimeRadarGenreMatcher.matches(selectedGenres, movieGenres, context.genreNamesByUuid());
            boolean favoriteMatch = preference.isIncludeFavorites()
                    && favoriteMovieUuids.contains(row.movieUuid());

            if (!selectedGenres.isEmpty() && !genreMatch && !favoriteMatch) {
                continue;
            }
            if (selectedGenres.isEmpty() && preference.isIncludeFavorites() && !favoriteMatch) {
                continue;
            }

            ScoredSuggestion suggestion = scoreSuggestion(
                    row, movie, context.cinemaNamesByRoom().get(row.cinemaRoomUuid()),
                    genreMatch, favoriteMatch, preference);
            if (suggestion.heatScore() >= MIN_HEAT_SCORE) {
                scored.add(suggestion);
            }
        }

        return scored.stream()
                .sorted(Comparator.comparingInt(ScoredSuggestion::heatScore).reversed())
                .limit(MAX_SUGGESTIONS)
                .map(ScoredSuggestion::response)
                .toList();
    }

    private ScoredSuggestion scoreSuggestion(
            ShowtimeAvailabilityRow row,
            Movie movie,
            String cinemaName,
            boolean genreMatch,
            boolean favoriteMatch,
            ShowtimeRadarPreference preference) {
        int score = 0;
        List<String> reasons = new ArrayList<>();

        if (genreMatch) {
            score += 30;
            reasons.add("Khớp thể loại yêu thích");
        }
        if (favoriteMatch) {
            score += 40;
            reasons.add("Phim trong danh sách yêu thích");
        }
        if (ShowtimeRadarGenreCodec.matchesTimeSlot(
                row.startTime(), preference.getTimeSlotStartHour(), preference.getTimeSlotEndHour())
                && preference.getTimeSlotStartHour() != null) {
            score += 20;
            reasons.add("Khung giờ phù hợp");
        }

        long available = row.availableSeats();
        if (available <= 10) {
            score += 25;
            reasons.add("Còn ít ghế");
        } else if (available <= 20) {
            score += 15;
            reasons.add("Ghế đang khan hiếm");
        }

        if (row.occupancyRate() < 0.5) {
            score += 20;
            reasons.add("Suất ít đông");
        } else if (row.occupancyRate() < 0.7) {
            score += 10;
            reasons.add("Suất vắng vừa phải");
        }

        ShowtimeRadarSuggestionResponse response = new ShowtimeRadarSuggestionResponse();
        response.setShowtimeUuid(row.showtimeUuid());
        response.setMovieUuid(row.movieUuid());
        response.setMovieTitle(movie.getTitle());
        response.setCinemaName(cinemaName != null ? cinemaName : "Rạp NASAFILM");
        response.setStartTime(row.startTime());
        response.setAvailableSeats((int) available);
        response.setHeatScore(score);
        response.setReasons(reasons);

        return new ScoredSuggestion(score, response);
    }

    private RadarContext loadRadarContext() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime windowEnd = now.plusHours(LOOKAHEAD_HOURS);

        List<ShowtimeAvailabilityRow> rows = showtimeRepository.findUpcomingAvailabilityRows(now, windowEnd).stream()
                .map(this::mapAvailabilityRow)
                .toList();

        Set<UUID> movieUuids = rows.stream().map(ShowtimeAvailabilityRow::movieUuid).collect(Collectors.toSet());
        Set<UUID> roomUuids = rows.stream().map(ShowtimeAvailabilityRow::cinemaRoomUuid).collect(Collectors.toSet());

        Map<UUID, Movie> moviesByUuid = movieUuids.isEmpty()
                ? Map.of()
                : movieRepository.findAllByIdWithGenres(movieUuids).stream()
                        .collect(Collectors.toMap(Movie::getUuid, movie -> movie));

        Map<UUID, Set<UUID>> genresByMovie = moviesByUuid.values().stream()
                .collect(Collectors.toMap(
                        Movie::getUuid,
                        movie -> movie.getMovieGenres().stream()
                                .map(MovieGenre::getGenre)
                                .filter(genre -> genre != null && genre.getUuid() != null)
                                .map(genre -> genre.getUuid())
                                .collect(Collectors.toSet())));

        Map<UUID, String> cinemaNamesByRoom = roomUuids.isEmpty()
                ? Map.of()
                : cinemaRoomRepository.findAllByIdWithCinema(roomUuids).stream()
                        .collect(Collectors.toMap(
                                CinemaRoom::getUuid,
                                room -> room.getCinema() != null ? room.getCinema().getName() : "Rạp NASAFILM"));

        Map<UUID, String> genreNamesByUuid = genreRepository.findAll().stream()
                .collect(Collectors.toMap(genre -> genre.getUuid(), genre -> genre.getName()));

        int upcomingShowtimeCount = (int) rows.stream()
                .filter(row -> row.availableSeats() > 0)
                .count();

        return new RadarContext(rows, moviesByUuid, genresByMovie, cinemaNamesByRoom, genreNamesByUuid, upcomingShowtimeCount);
    }

    private Set<UUID> loadFavoriteMovieUuids(UUID userUuid) {
        return userFavoriteRepository.findByUserUuidOrderByCreatedAtDesc(userUuid).stream()
                .map(UserFavorite::getMovieUuid)
                .collect(Collectors.toSet());
    }

    private ShowtimeAvailabilityRow mapAvailabilityRow(Object[] row) {
        return new ShowtimeAvailabilityRow(
                toUuid(row[0]),
                toUuid(row[1]),
                toUuid(row[2]),
                toOffsetDateTime(row[3]),
                ((Number) row[4]).intValue(),
                ((Number) row[5]).longValue(),
                ((Number) row[6]).longValue());
    }

    private UUID toUuid(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(value.toString());
    }

    private OffsetDateTime toOffsetDateTime(Object value) {
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof Instant instant) {
            return instant.atZone(ZoneId.systemDefault()).toOffsetDateTime();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant().atZone(ZoneId.systemDefault()).toOffsetDateTime();
        }
        throw new IllegalArgumentException("Unsupported timestamp type: " + value.getClass());
    }

    private ShowtimeRadarPreference defaultPreference(UUID userUuid) {
        ShowtimeRadarPreference preference = new ShowtimeRadarPreference();
        preference.setUserUuid(userUuid);
        preference.setEnabled(false);
        preference.setIncludeFavorites(true);
        preference.setGenreUuids("");
        preference.setUpdatedAt(OffsetDateTime.now());
        return preference;
    }

    private ShowtimeRadarPreferenceResponse toResponse(
            ShowtimeRadarPreference preference,
            List<ShowtimeRadarSuggestionResponse> suggestions,
            int upcomingShowtimeCount) {
        ShowtimeRadarPreferenceResponse response = new ShowtimeRadarPreferenceResponse();
        response.setEnabled(preference.isEnabled());
        response.setGenreUuids(ShowtimeRadarGenreCodec.decode(preference.getGenreUuids()));
        response.setTimeSlotStartHour(preference.getTimeSlotStartHour());
        response.setTimeSlotEndHour(preference.getTimeSlotEndHour());
        response.setIncludeFavorites(preference.isIncludeFavorites());
        response.setUpdatedAt(preference.getUpdatedAt());
        response.setUpcomingShowtimeCount(upcomingShowtimeCount);
        response.setSuggestions(suggestions);
        return response;
    }

    private UUID resolveUserUuid(String userEmail) {
        return userRepository.findByEmailIgnoreCase(userEmail)
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Người dùng chưa đăng nhập"));
    }

    private void validateHour(int hour, String field) {
        if (hour < 0 || hour > 23) {
            throw new AppException(ErrorCode.BAD_REQUEST, field + " phải từ 0 đến 23");
        }
    }

    private boolean hasActiveFilters(ShowtimeRadarPreference preference) {
        boolean hasGenres = !ShowtimeRadarGenreCodec.decode(preference.getGenreUuids()).isEmpty();
        boolean hasFavorites = preference.isIncludeFavorites();
        return hasGenres || hasFavorites;
    }

    private record ScoredSuggestion(int heatScore, ShowtimeRadarSuggestionResponse response) {
    }

    private record RadarContext(
            List<ShowtimeAvailabilityRow> availabilityRows,
            Map<UUID, Movie> moviesByUuid,
            Map<UUID, Set<UUID>> genresByMovie,
            Map<UUID, String> cinemaNamesByRoom,
            Map<UUID, String> genreNamesByUuid,
            int upcomingShowtimeCount) {
    }
}
