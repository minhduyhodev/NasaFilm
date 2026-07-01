package com.thdpv.movietheater.movie.service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.config.cache.CacheNames;
import com.thdpv.movietheater.config.cache.ReviewVibeTagCacheEvictor;
import com.thdpv.movietheater.movie.dto.request.CreateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.response.AdminReviewVibeTagResponse;
import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;
import com.thdpv.movietheater.movie.entity.ReviewVibeTagDefinition;
import com.thdpv.movietheater.movie.enums.MovieReviewStatus;
import com.thdpv.movietheater.movie.enums.ReviewVibeTag;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.movie.repository.ReviewVibeTagDefinitionRepository;
import com.thdpv.movietheater.movie.util.ReviewVibeTagUtil;

import jakarta.annotation.PostConstruct;

@Service
public class ReviewVibeTagService {

    private static final int MAX_TAGS_PER_REVIEW = 3;

    private final ReviewVibeTagDefinitionRepository reviewVibeTagDefinitionRepository;
    private final MovieReviewRepository movieReviewRepository;
    private final ReviewVibeTagCacheEvictor reviewVibeTagCacheEvictor;
    private ReviewVibeTagService self;

    public ReviewVibeTagService(
            ReviewVibeTagDefinitionRepository reviewVibeTagDefinitionRepository,
            MovieReviewRepository movieReviewRepository,
            ReviewVibeTagCacheEvictor reviewVibeTagCacheEvictor) {
        this.reviewVibeTagDefinitionRepository = reviewVibeTagDefinitionRepository;
        this.movieReviewRepository = movieReviewRepository;
        this.reviewVibeTagCacheEvictor = reviewVibeTagCacheEvictor;
    }

    @Autowired
    @Lazy
    void setSelf(ReviewVibeTagService self) {
        this.self = self;
    }

    @PostConstruct
    @Transactional
    public void seedDefaultsIfEmpty() {
        if (reviewVibeTagDefinitionRepository.count() > 0) {
            return;
        }
        int order = 0;
        for (ReviewVibeTag tag : ReviewVibeTag.values()) {
            ReviewVibeTagDefinition definition = new ReviewVibeTagDefinition();
            definition.setCode(tag.getCode());
            definition.setLabel(tag.getLabel());
            definition.setHash(tag.getHash());
            definition.setActive(true);
            definition.setDisplayOrder(order++);
            reviewVibeTagDefinitionRepository.save(definition);
        }
    }

    @Cacheable(value = CacheNames.REVIEW_VIBE_TAG_CATALOG, key = "'active-list'")
    @Transactional(readOnly = true)
    public List<ReviewVibeTagResponse> listActivePublic() {
        Map<String, Long> usageCounts = loadGlobalUsageCounts();
        return reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc().stream()
                .map(this::toPublicResponse)
                .sorted(Comparator
                        .comparing((ReviewVibeTagResponse tag) -> usageCounts.getOrDefault(tag.getCode(), 0L))
                        .reversed()
                        .thenComparing(ReviewVibeTagResponse::getLabel, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminReviewVibeTagResponse> listAllAdmin() {
        return reviewVibeTagDefinitionRepository.findAll().stream()
                .sorted(Comparator.comparing(ReviewVibeTagDefinition::getLabel, String.CASE_INSENSITIVE_ORDER))
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional
    public AdminReviewVibeTagResponse create(CreateReviewVibeTagRequest request) {
        String code = normalizeCode(request.getCode());
        if (reviewVibeTagDefinitionRepository.existsByCodeIgnoreCase(code)) {
            throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Ma vibe tag da ton tai");
        }

        ReviewVibeTagDefinition definition = new ReviewVibeTagDefinition();
        definition.setCode(code);
        definition.setLabel(request.getLabel().trim());
        definition.setHash(request.getHash().trim());
        definition.setActive(true);
        definition.setDisplayOrder(0);
        AdminReviewVibeTagResponse response = toAdminResponse(reviewVibeTagDefinitionRepository.save(definition));
        reviewVibeTagCacheEvictor.evictCatalog();
        return response;
    }

    @Transactional
    public AdminReviewVibeTagResponse update(UUID uuid, UpdateReviewVibeTagRequest request) {
        ReviewVibeTagDefinition definition = reviewVibeTagDefinitionRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag khong ton tai"));

        definition.setLabel(request.getLabel().trim());
        definition.setHash(request.getHash().trim());
        definition.setActive(request.isActive());
        AdminReviewVibeTagResponse response = toAdminResponse(reviewVibeTagDefinitionRepository.save(definition));
        reviewVibeTagCacheEvictor.evictCatalog();
        return response;
    }

    @Transactional(readOnly = true)
    public List<String> normalizeAndValidate(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return List.of();
        }

        Set<String> activeCodes = activeCodeSet();
        Set<String> unique = new LinkedHashSet<>();
        for (String raw : rawTags) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String code = normalizeCode(raw);
            if (!activeCodes.contains(code)) {
                throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag khong hop le: " + raw);
            }
            unique.add(code);
        }

        if (unique.size() > MAX_TAGS_PER_REVIEW) {
            throw new AppException(
                    ErrorCode.REVIEW_INVALID_VIBE_TAGS,
                    "Chi duoc chon toi da " + MAX_TAGS_PER_REVIEW + " vibe tag");
        }

        return List.copyOf(unique);
    }

    @Transactional(readOnly = true)
    public String validateFilterCode(String vibeTag) {
        if (vibeTag == null || vibeTag.isBlank()) {
            return null;
        }
        String code = normalizeCode(vibeTag);
        if (!activeCodeSet().contains(code)) {
            throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag loc khong hop le");
        }
        return code;
    }

    @Cacheable(value = CacheNames.REVIEW_VIBE_TAG_CATALOG, key = "'active-codes'")
    @Transactional(readOnly = true)
    public Set<String> loadActiveCodeSet() {
        return reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc().stream()
                .map(tag -> tag.getCode().toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    private Set<String> activeCodeSet() {
        ReviewVibeTagService target = self != null ? self : this;
        return target.loadActiveCodeSet();
    }

    private Map<String, Long> loadGlobalUsageCounts() {
        return ReviewVibeTagUtil.toSortedTagCountMap(
                movieReviewRepository.aggregateGlobalVibeTagCounts(MovieReviewStatus.VISIBLE.name()));
    }

    private String normalizeCode(String raw) {
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    private ReviewVibeTagResponse toPublicResponse(ReviewVibeTagDefinition definition) {
        return new ReviewVibeTagResponse(
                definition.getCode(),
                definition.getLabel(),
                definition.getHash());
    }

    private AdminReviewVibeTagResponse toAdminResponse(ReviewVibeTagDefinition definition) {
        AdminReviewVibeTagResponse response = new AdminReviewVibeTagResponse();
        response.setUuid(definition.getUuid());
        response.setCode(definition.getCode());
        response.setLabel(definition.getLabel());
        response.setHash(definition.getHash());
        response.setActive(definition.isActive());
        response.setDisplayOrder(definition.getDisplayOrder());
        response.setCreatedAt(definition.getCreatedAt());
        response.setUpdatedAt(definition.getUpdatedAt());
        return response;
    }
}
