package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

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

    public ReferenceMetadataSeeder(GenreRepository genreRepository,
            CountryRepository countryRepository,
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader) {
        this.genreRepository = genreRepository;
        this.countryRepository = countryRepository;
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
    }

    public void seedAll() {
        seedGenres();
        seedCountries();
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
