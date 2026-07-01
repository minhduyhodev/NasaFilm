package com.thdpv.movietheater.movie.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.dto.request.CreateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateReviewVibeTagRequest;
import com.thdpv.movietheater.movie.dto.response.AdminReviewVibeTagResponse;
import com.thdpv.movietheater.movie.dto.response.ReviewVibeTagResponse;
import com.thdpv.movietheater.movie.entity.ReviewVibeTagDefinition;
import com.thdpv.movietheater.movie.enums.ReviewVibeTag;
import com.thdpv.movietheater.movie.repository.ReviewVibeTagDefinitionRepository;

import jakarta.annotation.PostConstruct;

@Service
public class ReviewVibeTagService {

    private static final int MAX_TAGS_PER_REVIEW = 3;

    private final ReviewVibeTagDefinitionRepository reviewVibeTagDefinitionRepository;

    public ReviewVibeTagService(ReviewVibeTagDefinitionRepository reviewVibeTagDefinitionRepository) {
        this.reviewVibeTagDefinitionRepository = reviewVibeTagDefinitionRepository;
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

    @Transactional(readOnly = true)
    public List<ReviewVibeTagResponse> listActivePublic() {
        return reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc().stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminReviewVibeTagResponse> listAllAdmin() {
        return reviewVibeTagDefinitionRepository.findAllByOrderByDisplayOrderAscLabelAsc().stream()
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
        definition.setDisplayOrder(request.getDisplayOrder());
        return toAdminResponse(reviewVibeTagDefinitionRepository.save(definition));
    }

    @Transactional
    public AdminReviewVibeTagResponse update(UUID uuid, UpdateReviewVibeTagRequest request) {
        ReviewVibeTagDefinition definition = reviewVibeTagDefinitionRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag khong ton tai"));

        definition.setLabel(request.getLabel().trim());
        definition.setHash(request.getHash().trim());
        definition.setActive(request.isActive());
        definition.setDisplayOrder(request.getDisplayOrder());
        return toAdminResponse(reviewVibeTagDefinitionRepository.save(definition));
    }

    @Transactional(readOnly = true)
    public List<String> normalizeAndValidate(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return List.of();
        }

        Set<String> activeCodes = loadActiveCodeSet();
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
        if (!loadActiveCodeSet().contains(code)) {
            throw new AppException(ErrorCode.REVIEW_INVALID_VIBE_TAGS, "Vibe tag loc khong hop le");
        }
        return code;
    }

    @Transactional(readOnly = true)
    public Set<String> loadActiveCodeSet() {
        return reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc().stream()
                .map(tag -> tag.getCode().toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
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
