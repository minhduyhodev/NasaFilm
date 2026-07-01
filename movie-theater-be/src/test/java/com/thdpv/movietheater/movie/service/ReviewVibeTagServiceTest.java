package com.thdpv.movietheater.movie.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.entity.ReviewVibeTagDefinition;
import com.thdpv.movietheater.movie.repository.ReviewVibeTagDefinitionRepository;

@ExtendWith(MockitoExtension.class)
class ReviewVibeTagServiceTest {

    @Mock
    private ReviewVibeTagDefinitionRepository reviewVibeTagDefinitionRepository;

    @InjectMocks
    private ReviewVibeTagService reviewVibeTagService;

    @Test
    void normalizeAndValidate_deduplicatesBeforeLimitCheck() {
        when(reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc())
                .thenReturn(List.of(
                        activeTag("cam_dong"),
                        activeTag("plot_twist"),
                        activeTag("so"),
                        activeTag("hai_long")));

        List<String> result = reviewVibeTagService.normalizeAndValidate(
                List.of("cam_dong", "cam_dong", "plot_twist", "so"));

        assertEquals(List.of("cam_dong", "plot_twist", "so"), result);
    }

    @Test
    void normalizeAndValidate_rejectsMoreThanThreeUniqueTags() {
        when(reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc())
                .thenReturn(List.of(
                        activeTag("cam_dong"),
                        activeTag("plot_twist"),
                        activeTag("so"),
                        activeTag("hai_long")));

        AppException ex = assertThrows(AppException.class, () -> reviewVibeTagService.normalizeAndValidate(
                List.of("cam_dong", "plot_twist", "so", "hai_long")));
        assertEquals(ErrorCode.REVIEW_INVALID_VIBE_TAGS, ex.getErrorCode());
    }

    @Test
    void validateFilterCode_rejectsInactiveOrUnknownTag() {
        when(reviewVibeTagDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc())
                .thenReturn(List.of(activeTag("cam_dong")));

        assertEquals("cam_dong", reviewVibeTagService.validateFilterCode("CAM_DONG"));
        assertThrows(AppException.class, () -> reviewVibeTagService.validateFilterCode("so"));
    }

    private ReviewVibeTagDefinition activeTag(String code) {
        ReviewVibeTagDefinition definition = new ReviewVibeTagDefinition();
        definition.setUuid(UUID.randomUUID());
        definition.setCode(code);
        definition.setLabel(code);
        definition.setHash("#" + code);
        definition.setActive(true);
        return definition;
    }
}
