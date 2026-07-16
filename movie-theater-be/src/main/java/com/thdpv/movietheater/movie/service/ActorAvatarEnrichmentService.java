package com.thdpv.movietheater.movie.service;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.movie.dto.response.ActorAvatarEnrichmentResponse;
import com.thdpv.movietheater.movie.dto.response.ActorAvatarEnrichmentResponse.ActorAvatarEnrichmentItem;
import com.thdpv.movietheater.movie.entity.Actor;
import com.thdpv.movietheater.movie.repository.ActorRepository;

@Service
public class ActorAvatarEnrichmentService {

    private static final Logger logger = LoggerFactory.getLogger(ActorAvatarEnrichmentService.class);
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final String TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

    private final ActorRepository actorRepository;
    private final RestClient restClient;
    private final String tmdbApiKey;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    public ActorAvatarEnrichmentService(
            ActorRepository actorRepository,
            ResourceLoader resourceLoader,
            ObjectMapper objectMapper,
            @Value("${app.tmdb.api-key:}") String tmdbApiKey) {
        this.actorRepository = actorRepository;
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.tmdbApiKey = tmdbApiKey == null ? "" : tmdbApiKey.trim();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(8000);
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader("User-Agent", "NasaFilmBot/1.0 (actor-avatar-enrichment; contact@nasafilm.local)")
                .defaultHeader("Accept", "application/json")
                .build();
    }

    @Transactional
    public int backfillAvatarsFromSeedJson() {
        int updated = 0;
        try {
            var resource = resourceLoader.getResource("classpath:data/actors.json");
            if (!resource.exists()) {
                return 0;
            }
            List<Map<String, String>> seedActors;
            try (InputStream input = resource.getInputStream()) {
                seedActors = objectMapper.readValue(input, new TypeReference<>() {});
            }
            for (Map<String, String> seed : seedActors) {
                String fullName = seed.get("fullName");
                String avatarUrl = seed.get("avatarUrl");
                if (fullName == null || avatarUrl == null || avatarUrl.isBlank()) {
                    continue;
                }
                var actorOpt = actorRepository.findByFullNameIgnoreCase(fullName);
                if (actorOpt.isPresent() && !hasAvatar(actorOpt.get().getAvatarUrl())) {
                    Actor actor = actorOpt.get();
                    actor.setAvatarUrl(avatarUrl.trim());
                    actorRepository.save(actor);
                    updated++;
                }
            }
            logger.info("Backfilled {} actor avatars from actors.json", updated);
        } catch (Exception ex) {
            logger.warn("Failed to backfill actor avatars from actors.json: {}", ex.getMessage());
        }
        return updated;
    }

    @Transactional
    public ActorAvatarEnrichmentResponse enrichMissingAvatars() {
        List<Actor> candidates = actorRepository.findWithoutAvatar();
        List<ActorAvatarEnrichmentItem> items = new ArrayList<>();
        int enriched = 0;
        int skipped = 0;
        int failed = 0;

        for (Actor actor : candidates) {
            if (hasAvatar(actor.getAvatarUrl())) {
                skipped++;
                items.add(new ActorAvatarEnrichmentItem(
                        actor.getUuid().toString(),
                        actor.getFullName(),
                        "skipped",
                        actor.getAvatarUrl(),
                        "existing"));
                continue;
            }

            String avatarUrl = resolveAvatarUrl(actor);
            if (avatarUrl == null || avatarUrl.isBlank()) {
                failed++;
                items.add(new ActorAvatarEnrichmentItem(
                        actor.getUuid().toString(),
                        actor.getFullName(),
                        "not_found",
                        null,
                        null));
                continue;
            }

            actor.setAvatarUrl(avatarUrl);
            actorRepository.save(actor);
            enriched++;
            String source = avatarUrl.contains("tmdb.org") ? "tmdb" : "wikipedia";
            items.add(new ActorAvatarEnrichmentItem(
                    actor.getUuid().toString(),
                    actor.getFullName(),
                    "enriched",
                    avatarUrl,
                    source));
            logger.info("Enriched avatar for actor '{}' via {}", actor.getFullName(), source);

            pauseBetweenLookups();
        }

        return new ActorAvatarEnrichmentResponse(candidates.size(), enriched, skipped, failed, items);
    }

    private String resolveAvatarUrl(Actor actor) {
        String fromTmdb = fetchFromTmdb(actor.getFullName());
        if (fromTmdb != null) {
            return fromTmdb;
        }
        return fetchFromWikipedia(actor.getFullName(), wikiLangFor(actor));
    }

    private String fetchFromTmdb(String fullName) {
        if (tmdbApiKey.isBlank()) {
            return null;
        }
        try {
            String url = "https://api.themoviedb.org/3/search/person?query="
                    + URLEncoder.encode(fullName, StandardCharsets.UTF_8)
                    + "&include_adult=false&language=en-US&api_key="
                    + URLEncoder.encode(tmdbApiKey, StandardCharsets.UTF_8);

            JsonNode root = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(JsonNode.class);

            if (root == null || !root.has("results") || !root.get("results").isArray()) {
                return null;
            }

            String normalizedQuery = normalizeName(fullName);
            for (JsonNode result : root.get("results")) {
                String name = result.path("name").asText("");
                String profilePath = result.path("profile_path").asText("");
                if (profilePath.isBlank() || !namesLikelyMatch(normalizedQuery, normalizeName(name))) {
                    continue;
                }
                return TMDB_IMAGE_BASE + profilePath;
            }
        } catch (Exception ex) {
            logger.warn("TMDB lookup failed for '{}': {}", fullName, ex.getMessage());
        }
        return null;
    }

    private String fetchFromWikipedia(String fullName, String wikiLang) {
        for (String lang : List.of(wikiLang, "en")) {
            String directTitle = fullName.trim().replace(' ', '_');
            String thumbnail = fetchWikipediaThumbnailByTitle(directTitle, lang);
            if (thumbnail != null) {
                return thumbnail;
            }
            thumbnail = fetchWikipediaThumbnail(fullName, lang);
            if (thumbnail != null) {
                return thumbnail;
            }
        }
        return null;
    }

    private String fetchWikipediaThumbnailByTitle(String title, String wikiLang) {
        try {
            String summaryUrl = "https://" + wikiLang + ".wikipedia.org/api/rest_v1/page/summary/"
                    + URLEncoder.encode(title, StandardCharsets.UTF_8);

            JsonNode summary = restClient.get()
                    .uri(summaryUrl)
                    .retrieve()
                    .body(JsonNode.class);

            return extractThumbnail(summary);
        } catch (Exception ex) {
            return null;
        }
    }

    private String fetchWikipediaThumbnail(String fullName, String wikiLang) {
        try {
            String title = searchWikipediaTitle(fullName, wikiLang);
            if (title == null || title.isBlank()) {
                return null;
            }

            String summaryUrl = "https://" + wikiLang + ".wikipedia.org/api/rest_v1/page/summary/"
                    + URLEncoder.encode(title.replace(' ', '_'), StandardCharsets.UTF_8);

            JsonNode summary = restClient.get()
                    .uri(summaryUrl)
                    .retrieve()
                    .body(JsonNode.class);

            return extractThumbnail(summary);
        } catch (Exception ex) {
            logger.debug("Wikipedia lookup failed for '{}' ({}): {}", fullName, wikiLang, ex.getMessage());
            return null;
        }
    }

    private String extractThumbnail(JsonNode summary) {
        if (summary == null || summary.path("thumbnail").isMissingNode()) {
            return null;
        }
        String source = summary.path("thumbnail").path("source").asText("");
        return source.isBlank() ? null : source;
    }

    private String searchWikipediaTitle(String fullName, String wikiLang) {
        try {
            String searchUrl = "https://" + wikiLang + ".wikipedia.org/w/api.php?action=opensearch&search="
                    + URLEncoder.encode(fullName, StandardCharsets.UTF_8)
                    + "&limit=3&namespace=0&format=json";

            JsonNode response = restClient.get()
                    .uri(searchUrl)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || !response.isArray() || response.size() < 2) {
                return null;
            }

            JsonNode titles = response.get(1);
            if (!titles.isArray() || titles.isEmpty()) {
                return null;
            }

            String normalizedQuery = normalizeName(fullName);
            for (JsonNode titleNode : titles) {
                String title = titleNode.asText("");
                if (namesLikelyMatch(normalizedQuery, normalizeName(title))) {
                    return title;
                }
            }
            return titles.get(0).asText(null);
        } catch (Exception ex) {
            logger.debug("Wikipedia search failed for '{}' ({}): {}", fullName, wikiLang, ex.getMessage());
            return null;
        }
    }

    private String wikiLangFor(Actor actor) {
        if (actor.getCountry() == null || actor.getCountry().getName() == null) {
            return "en";
        }
        String country = actor.getCountry().getName().toLowerCase(Locale.ROOT);
        if (country.contains("việt") || country.contains("viet")) {
            return "vi";
        }
        if (country.contains("hàn") || country.contains("korea")) {
            return "ko";
        }
        if (country.contains("nhật") || country.contains("japan")) {
            return "ja";
        }
        if (country.contains("trung") || country.contains("china")) {
            return "zh";
        }
        return "en";
    }

    private boolean hasAvatar(String avatarUrl) {
        return avatarUrl != null && !avatarUrl.isBlank();
    }

    private boolean namesLikelyMatch(String left, String right) {
        if (left.isBlank() || right.isBlank()) {
            return false;
        }
        if (left.equals(right)) {
            return true;
        }
        if (left.contains(right) || right.contains(left)) {
            return true;
        }
        String[] leftParts = left.split("\\s+");
        String[] rightParts = right.split("\\s+");
        int matches = 0;
        for (String lp : leftParts) {
            if (lp.length() < 2) {
                continue;
            }
            for (String rp : rightParts) {
                if (lp.equals(rp)) {
                    matches++;
                }
            }
        }
        return matches >= Math.min(2, Math.min(leftParts.length, rightParts.length));
    }

    private String normalizeName(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = DIACRITICS.matcher(normalized).replaceAll("");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private void pauseBetweenLookups() {
        try {
            Thread.sleep(200L);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
