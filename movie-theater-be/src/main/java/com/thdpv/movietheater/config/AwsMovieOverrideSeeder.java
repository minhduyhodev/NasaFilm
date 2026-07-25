package com.thdpv.movietheater.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieCountry;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import lombok.RequiredArgsConstructor;

/**
 * Áp dụng media AWS từ file riêng — lưu S3 key ({@code movie/...}), không lưu Object URL.
 * Tránh sửa {@code movies.json} (giảm merge conflict).
 */
@Component
@RequiredArgsConstructor
public class AwsMovieOverrideSeeder {

    private static final Logger logger = LoggerFactory.getLogger(AwsMovieOverrideSeeder.class);

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;

    @Transactional
    public void applyOverrides() {
        try {
            Resource resource = resourceLoader.getResource("classpath:data/movies_aws_overrides.json");
            if (!resource.exists()) {
                return;
            }
            List<AwsOverride> overrides = objectMapper.readValue(
                    resource.getInputStream(), new TypeReference<List<AwsOverride>>() {
                    });
            if (overrides == null || overrides.isEmpty()) {
                return;
            }
            int updated = 0;
            int created = 0;
            for (AwsOverride item : overrides) {
                if (item.matchTitle == null || item.matchTitle.isBlank()) {
                    continue;
                }
                Optional<Movie> existing = movieRepository.findByTitleIgnoreCase(item.matchTitle.trim());
                if (existing.isPresent()) {
                    applyMedia(existing.get(), item);
                    if (item.status != null && !item.status.isBlank()) {
                        existing.get().setStatus(item.status.trim());
                    }
                    movieRepository.save(existing.get());
                    updated++;
                } else if (Boolean.TRUE.equals(item.createIfMissing)) {
                    createMovie(item);
                    created++;
                }
            }
            logger.info("AWS movie overrides applied: updated={}, created={}", updated, created);
        } catch (Exception e) {
            logger.warn("AWS movie overrides skipped: {}", e.getMessage());
        }
    }

    private void applyMedia(Movie movie, AwsOverride item) {
        if (item.streamingUrl != null && !item.streamingUrl.isBlank()) {
            movie.setStreamingUrl(S3MediaBorderUtils.toStoredKey(item.streamingUrl));
        }
        upsertMedia(movie, "POSTER", item.posterUrl, item.matchTitle + " Poster", true, 1);
        upsertMedia(movie, "TRAILER", item.trailerUrl, item.matchTitle + " Trailer", false, 2);
    }

    private void upsertMedia(Movie movie, String type, String url, String title, boolean primary, int sortOrder) {
        if (url == null || url.isBlank()) {
            return;
        }
        String stored = S3MediaBorderUtils.toStoredKey(url);
        if (movie.getMovieMedias() != null) {
            for (MovieMedia mm : movie.getMovieMedias()) {
                if (type.equals(mm.getMediaType())) {
                    mm.setMediaUrl(stored);
                    mm.setTitle(title);
                    return;
                }
            }
        }
        MovieMedia media = new MovieMedia();
        media.setMovie(movie);
        media.setMediaUrl(stored);
        media.setMediaType(type);
        media.setTitle(title);
        media.setIsPrimary(primary);
        media.setSortOrder(sortOrder);
        movie.addMovieMedia(media);
    }

    private void createMovie(AwsOverride item) {
        Movie movie = new Movie();
        movie.setTitle(item.matchTitle.trim());
        movie.setDescription(item.description != null ? item.description : item.matchTitle);
        movie.setDurationMinutes(item.durationMinutes != null ? item.durationMinutes : 120);
        movie.setReleaseDate(parseDate(item.releaseDate));
        movie.setStatus(item.status != null ? item.status : "NOW_SHOWING");
        movie.setAgeRestriction(item.ageRating != null ? item.ageRating : "P");
        movie.setOnlinePrice(BigDecimal.valueOf(45000));
        movie.setRating(8.0);

        if (item.genres != null) {
            for (String genreName : item.genres) {
                Genre genre = genreRepository.findByNameIgnoreCase(genreName).orElseGet(() -> {
                    Genre g = new Genre();
                    g.setName(genreName);
                    return genreRepository.save(g);
                });
                MovieGenre mg = new MovieGenre();
                mg.setMovie(movie);
                mg.setGenre(genre);
                movie.addMovieGenre(mg);
            }
        }
        if (item.countries != null) {
            for (String countryName : item.countries) {
                Country country = countryRepository.findByNameIgnoreCase(countryName).orElseGet(() -> {
                    Country c = new Country();
                    c.setName(countryName);
                    c.setCode(countryName.substring(0, Math.min(2, countryName.length())).toUpperCase());
                    return countryRepository.save(c);
                });
                MovieCountry mc = new MovieCountry();
                mc.setMovie(movie);
                mc.setCountry(country);
                movie.addMovieCountry(mc);
            }
        }
        applyMedia(movie, item);
        movieRepository.save(movie);
        logger.info("Created AWS movie from override: {}", movie.getTitle());
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    public static class AwsOverride {
        public String matchTitle;
        public Boolean createIfMissing;
        public String description;
        public Integer durationMinutes;
        public String releaseDate;
        public String status;
        public String ageRating;
        public List<String> genres;
        public List<String> countries;
        public String posterUrl;
        public String trailerUrl;
        public String streamingUrl;
    }
}
