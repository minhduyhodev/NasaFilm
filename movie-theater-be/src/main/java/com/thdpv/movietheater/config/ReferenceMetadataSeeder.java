package com.thdpv.movietheater.config;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.util.MojibakeUtils;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;

/**
 * Seeds reference catalogs (genres, countries) used by movie filters on the
 * public site.
 * Idempotent: only inserts records that do not already exist.
 */
@Component
public class ReferenceMetadataSeeder {

    private static final Logger logger = LoggerFactory.getLogger(ReferenceMetadataSeeder.class);

    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final JdbcTemplate jdbcTemplate;

    public ReferenceMetadataSeeder(GenreRepository genreRepository,
            CountryRepository countryRepository,
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            JdbcTemplate jdbcTemplate) {
        this.genreRepository = genreRepository;
        this.countryRepository = countryRepository;
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void seedAll() {
        healMojibakeGenres();
        healMojibakeCountries();
        seedGenres();
        seedCountries();
    }

    /** Gọi độc lập khi seed tắt — dọn thể loại / quốc gia lỗi font đã nằm trong DB. */
    public void healCatalogEncoding() {
        healMojibakeGenres();
        healMojibakeCountries();
    }

    /**
     * Sửa thể loại lỗi font: mojibake ({@code BÃ­ áº©n}), U+FFFD, hoặc ASCII {@code ?}
     * (vd. {@code ?m nh?c} → {@code Âm nhạc}).
     */
    private void healMojibakeGenres() {
        int healed = 0;
        List<Genre> all = genreRepository.findAll();
        List<String> goodNames = new java.util.ArrayList<>(all.stream()
                .map(Genre::getName)
                .filter(n -> n != null && !MojibakeUtils.looksCorrupt(n))
                .toList());
        goodNames.addAll(loadCanonicalGenreNames());

        for (Genre genre : all) {
            String name = genre.getName();
            if (!MojibakeUtils.looksCorrupt(name)) {
                continue;
            }

            String fixed = MojibakeUtils.tryFix(name);
            if (fixed == null || fixed.equals(name)) {
                fixed = MojibakeUtils.matchCanonical(name, goodNames);
            }
            if (fixed == null || fixed.equals(name)) {
                logger.warn("Skip corrupt genre (no canonical match): '{}'", name);
                continue;
            }

            Optional<Genre> existing = genreRepository.findByNameIgnoreCase(fixed);
            if (existing.isPresent() && !existing.get().getUuid().equals(genre.getUuid())) {
                mergeGenreInto(genre.getUuid(), existing.get().getUuid());
                genreRepository.delete(genre);
                healed++;
                logger.info("Merged corrupt genre '{}' into '{}'", name, fixed);
            } else {
                genre.setName(fixed);
                genreRepository.save(genre);
                healed++;
                logger.info("Renamed corrupt genre '{}' -> '{}'", name, fixed);
            }
        }
        if (healed > 0) {
            logger.info("Healed {} corrupt genre row(s).", healed);
        }
    }

    private List<String> loadCanonicalGenreNames() {
        try {
            Resource resource = resourceLoader.getResource("classpath:data/genres.json");
            if (!resource.exists()) {
                return List.of();
            }
            try (InputStream is = resource.getInputStream()) {
                List<String> names = objectMapper.readValue(is, new TypeReference<List<String>>() {
                });
                return names == null ? List.of() : names;
            }
        } catch (Exception e) {
            logger.warn("Could not load genres.json for encoding heal", e);
            return List.of();
        }
    }

    private void mergeGenreInto(UUID fromGenreUuid, UUID toGenreUuid) {
        jdbcTemplate.update("""
                DELETE FROM movie_genre mg
                WHERE mg.genre_uuid = ?
                  AND EXISTS (
                      SELECT 1 FROM movie_genre ok
                      WHERE ok.movie_uuid = mg.movie_uuid AND ok.genre_uuid = ?
                  )
                """, fromGenreUuid, toGenreUuid);
        jdbcTemplate.update(
                "UPDATE movie_genre SET genre_uuid = ? WHERE genre_uuid = ?",
                toGenreUuid, fromGenreUuid);
    }

    /**
     * Sửa quốc gia lỗi font (vd. {@code HÃn Quá»'c} → {@code Hàn Quốc}) và gộp bản trùng.
     */
    private void healMojibakeCountries() {
        int healed = 0;
        List<Country> all = countryRepository.findAll();
        List<String> goodNames = all.stream()
                .map(Country::getName)
                .filter(n -> n != null && !MojibakeUtils.looksCorrupt(n))
                .toList();

        for (Country country : all) {
            String name = country.getName();
            if (!MojibakeUtils.looksCorrupt(name)) {
                continue;
            }

            String fixed = MojibakeUtils.tryFix(name);
            if (fixed == null || fixed.equals(name)) {
                fixed = MojibakeUtils.matchCanonical(name, goodNames);
            }
            if (fixed == null || fixed.equals(name)) {
                logger.warn("Skip corrupt country (no canonical match): '{}'", name);
                continue;
            }

            Optional<Country> existing = countryRepository.findByNameIgnoreCase(fixed);
            if (existing.isPresent() && !existing.get().getUuid().equals(country.getUuid())) {
                mergeCountryInto(country.getUuid(), existing.get().getUuid());
                countryRepository.delete(country);
                healed++;
                logger.info("Merged corrupt country '{}' into '{}'", name, fixed);
            } else {
                country.setName(fixed);
                countryRepository.save(country);
                healed++;
                logger.info("Renamed corrupt country '{}' -> '{}'", name, fixed);
            }
        }
        if (healed > 0) {
            logger.info("Healed {} corrupt country row(s).", healed);
        }
    }

    private void mergeCountryInto(UUID fromCountryUuid, UUID toCountryUuid) {
        jdbcTemplate.update("""
                DELETE FROM movie_country mc
                WHERE mc.country_uuid = ?
                  AND EXISTS (
                      SELECT 1 FROM movie_country ok
                      WHERE ok.movie_uuid = mc.movie_uuid AND ok.country_uuid = ?
                  )
                """, fromCountryUuid, toCountryUuid);
        jdbcTemplate.update(
                "UPDATE movie_country SET country_uuid = ? WHERE country_uuid = ?",
                toCountryUuid, fromCountryUuid);
        jdbcTemplate.update(
                "UPDATE actor SET country_uuid = ? WHERE country_uuid = ?",
                toCountryUuid, fromCountryUuid);
    }

    private void seedGenres() {
        int created = 0;
        List<String> genresToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/genres.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    genresToSeed = objectMapper.readValue(is, new TypeReference<List<String>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load genres.json", e);
        }

        if (genresToSeed != null) {
            for (String name : genresToSeed) {
                if (!genreRepository.existsByNameIgnoreCase(name)) {
                    Genre genre = new Genre();
                    genre.setName(name);
                    genreRepository.save(genre);
                    created++;
                }
            }
        }
        logger.info("Genre catalog ready ({} new genres seeded).", created);
    }

    private void seedCountries() {
        int created = 0;
        List<Map<String, String>> countriesToSeed = null;

        try {
            Resource resource = resourceLoader.getResource("classpath:data/countries.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    countriesToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, String>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load local countries.json", e);
        }

        if (countriesToSeed != null) {
            for (Map<String, String> countryData : countriesToSeed) {
                String code = countryData.get("code");
                String name = countryData.get("name");
                if (code != null && name != null && !countryRepository.existsByCodeIgnoreCase(code)) {
                    Country country = new Country();
                    country.setCode(code);
                    country.setName(name);
                    countryRepository.save(country);
                    created++;
                }
            }
        }
        logger.info("Country catalog ready ({} new countries seeded).", created);
    }
}
