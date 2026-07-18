package com.thdpv.movietheater.discover.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverQuizOptionRequest;
import com.thdpv.movietheater.discover.dto.request.AdminDiscoverQuizSettingsRequest;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverQuizConfigResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverConfigResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverQuizOptionResponse;
import com.thdpv.movietheater.discover.entity.DiscoverQuizOption;
import com.thdpv.movietheater.discover.entity.DiscoverQuizSettings;
import com.thdpv.movietheater.discover.repository.DiscoverCuratedSuggestionRepository;
import com.thdpv.movietheater.discover.repository.DiscoverQuizOptionRepository;
import com.thdpv.movietheater.discover.repository.DiscoverQuizSettingsRepository;
import com.thdpv.movietheater.discover.support.DiscoverQuizConfig;

@Service
public class DiscoverQuizAdminService {

    private static final Set<String> ALLOWED_GROUPS = Set.of("MOOD", "DURATION", "VIEWING");

    private final DiscoverQuizSettingsRepository settingsRepository;
    private final DiscoverQuizOptionRepository optionRepository;
    private final DiscoverCuratedSuggestionRepository suggestionRepository;

    public DiscoverQuizAdminService(
            DiscoverQuizSettingsRepository settingsRepository,
            DiscoverQuizOptionRepository optionRepository,
            DiscoverCuratedSuggestionRepository suggestionRepository) {
        this.settingsRepository = settingsRepository;
        this.optionRepository = optionRepository;
        this.suggestionRepository = suggestionRepository;
    }

    @Transactional(readOnly = true)
    public DiscoverConfigResponse getPublicConfig() {
        DiscoverQuizSettings settings = findSettingsOrDefault();
        List<DiscoverQuizOption> activeOptions = optionRepository.findByActiveTrueOrderByOptionGroupAscSortOrderAsc();
        DiscoverConfigResponse fallback = DiscoverQuizConfig.toResponse();
        if (activeOptions.isEmpty()) {
            applySettings(fallback, settings);
            return fallback;
        }

        List<DiscoverQuizOptionResponse> moods = mapOptions(activeOptions, "MOOD");
        List<DiscoverQuizOptionResponse> durations = mapOptions(activeOptions, "DURATION");
        List<DiscoverQuizOptionResponse> viewing = mapOptions(activeOptions, "VIEWING");

        // Đồng bộ với getActiveKeys: nhóm không còn option active → fallback seed
        if (moods.isEmpty()) {
            moods = fallback.getMoodOptions();
        }
        if (durations.isEmpty()) {
            durations = fallback.getDurationOptions();
        }
        if (viewing.isEmpty()) {
            viewing = fallback.getViewingOptions();
        }

        DiscoverConfigResponse response = new DiscoverConfigResponse();
        applySettings(response, settings);
        response.setMoodOptions(moods);
        response.setDurationOptions(durations);
        response.setViewingOptions(viewing);
        response.setMoods(moods.stream().map(DiscoverQuizOptionResponse::getKey).toList());
        response.setDurations(durations.stream().map(DiscoverQuizOptionResponse::getKey).toList());
        response.setViewingLocations(viewing.stream().map(DiscoverQuizOptionResponse::getKey).toList());
        return response;
    }

    @Transactional(readOnly = true)
    public AdminDiscoverQuizConfigResponse getAdminConfig() {
        DiscoverQuizSettings settings = findSettingsOrDefault();
        AdminDiscoverQuizConfigResponse response = new AdminDiscoverQuizConfigResponse();
        response.setMaxMatches(settings.getMaxMatches());
        response.setMaxGenreSelections(settings.getMaxGenreSelections());
        response.setAuthenticatedQuestionCount(settings.getAuthenticatedQuestionCount());
        response.setGuestQuestionCount(settings.getGuestQuestionCount());
        response.setOptions(optionRepository.findAllByOrderByOptionGroupAscSortOrderAsc().stream()
                .map(this::toOptionResponse)
                .toList());
        return response;
    }

    @Transactional
    public AdminDiscoverQuizConfigResponse updateSettings(AdminDiscoverQuizSettingsRequest request) {
        DiscoverQuizSettings settings = ensureSettings();
        settings.setMaxMatches(request.getMaxMatches());
        settings.setMaxGenreSelections(request.getMaxGenreSelections());
        settings.setAuthenticatedQuestionCount(request.getAuthenticatedQuestionCount());
        settings.setGuestQuestionCount(request.getGuestQuestionCount());
        settingsRepository.save(settings);
        return getAdminConfig();
    }

    @Transactional
    public DiscoverQuizOptionResponse upsertOption(AdminDiscoverQuizOptionRequest request) {
        String group = normalizeGroup(request.getOptionGroup());
        String key = normalizeKey(request.getOptionKey());

        DiscoverQuizOption option;
        if (request.getUuid() != null) {
            option = optionRepository.findById(request.getUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lựa chọn quiz"));
            if (!option.getOptionGroup().equals(group) || !option.getOptionKey().equals(key)) {
                optionRepository.findByOptionGroupAndOptionKey(group, key).ifPresent(existing -> {
                    if (!existing.getUuid().equals(option.getUuid())) {
                        throw new AppException(ErrorCode.VALIDATION_FAILED, "option_key đã tồn tại trong nhóm");
                    }
                });
            }
        } else {
            if (optionRepository.existsByOptionGroupAndOptionKey(group, key)) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "option_key đã tồn tại trong nhóm");
            }
            option = new DiscoverQuizOption();
            option.setUuid(UUID.randomUUID());
        }

        option.setOptionGroup(group);
        option.setOptionKey(key);
        option.setLabel(request.getLabel().trim());
        option.setHint(blankToNull(request.getHint()));
        option.setIconKey(blankToNull(request.getIconKey()));
        option.setCode(blankToNull(request.getCode()));
        option.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        boolean nextActive = Boolean.TRUE.equals(request.getActive());
        if (!nextActive && option.getUuid() != null && option.isActive()) {
            long otherActive = optionRepository.findByOptionGroupAndActiveTrueOrderBySortOrderAsc(group)
                    .stream()
                    .filter(item -> !item.getUuid().equals(option.getUuid()))
                    .count();
            if (otherActive == 0) {
                throw new AppException(ErrorCode.VALIDATION_FAILED,
                        "Phải giữ ít nhất một lựa chọn active trong nhóm " + group);
            }
        }
        option.setActive(nextActive);
        return toOptionResponse(optionRepository.save(option));
    }

    @Transactional
    public void deleteOption(UUID uuid) {
        DiscoverQuizOption option = optionRepository.findById(uuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy lựa chọn quiz"));

        long activeInGroup = optionRepository.findByOptionGroupAndActiveTrueOrderBySortOrderAsc(option.getOptionGroup())
                .stream()
                .filter(item -> !item.getUuid().equals(option.getUuid()))
                .count();
        if (option.isActive() && activeInGroup == 0) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Không thể xóa lựa chọn active cuối cùng trong nhóm " + option.getOptionGroup());
        }

        if ("MOOD".equals(option.getOptionGroup())
                && suggestionRepository.existsByMood(option.getOptionKey())) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "Mood đang được dùng bởi gợi ý phim. Hãy xóa/đổi gợi ý trước hoặc tắt lựa chọn.");
        }

        optionRepository.delete(option);
    }

    @Transactional(readOnly = true)
    public Set<String> getActiveKeys(String optionGroup) {
        String group = normalizeGroup(optionGroup);
        List<DiscoverQuizOption> options = optionRepository.findByOptionGroupAndActiveTrueOrderBySortOrderAsc(group);
        if (options.isEmpty()) {
            return switch (group) {
                case "MOOD" -> DiscoverQuizConfig.MOODS;
                case "DURATION" -> DiscoverQuizConfig.DURATIONS;
                case "VIEWING" -> DiscoverQuizConfig.VIEWING_LOCATIONS;
                default -> Set.of();
            };
        }
        return options.stream().map(DiscoverQuizOption::getOptionKey).collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public int getMaxMatches() {
        return findSettingsOrDefault().getMaxMatches();
    }

    private void applySettings(DiscoverConfigResponse response, DiscoverQuizSettings settings) {
        response.setMaxMatches(settings.getMaxMatches());
        response.setMaxGenreSelections(settings.getMaxGenreSelections());
        response.setAuthenticatedQuestionCount(settings.getAuthenticatedQuestionCount());
        response.setGuestQuestionCount(settings.getGuestQuestionCount());
    }

    private DiscoverQuizSettings findSettingsOrDefault() {
        return settingsRepository.findById(1).orElseGet(() -> {
            DiscoverQuizSettings settings = new DiscoverQuizSettings();
            settings.setId(1);
            settings.setMaxMatches(DiscoverQuizConfig.MAX_MATCHES);
            settings.setMaxGenreSelections(DiscoverQuizConfig.MAX_GENRE_SELECTIONS);
            settings.setAuthenticatedQuestionCount(DiscoverQuizConfig.AUTHENTICATED_QUESTION_COUNT);
            settings.setGuestQuestionCount(DiscoverQuizConfig.GUEST_QUESTION_COUNT);
            return settings;
        });
    }

    private DiscoverQuizSettings ensureSettings() {
        return settingsRepository.findById(1).orElseGet(() -> {
            DiscoverQuizSettings settings = new DiscoverQuizSettings();
            settings.setId(1);
            settings.setMaxMatches(DiscoverQuizConfig.MAX_MATCHES);
            settings.setMaxGenreSelections(DiscoverQuizConfig.MAX_GENRE_SELECTIONS);
            settings.setAuthenticatedQuestionCount(DiscoverQuizConfig.AUTHENTICATED_QUESTION_COUNT);
            settings.setGuestQuestionCount(DiscoverQuizConfig.GUEST_QUESTION_COUNT);
            return settingsRepository.save(settings);
        });
    }

    private List<DiscoverQuizOptionResponse> mapOptions(List<DiscoverQuizOption> options, String group) {
        return options.stream()
                .filter(option -> group.equals(option.getOptionGroup()))
                .map(this::toOptionResponse)
                .toList();
    }

    private DiscoverQuizOptionResponse toOptionResponse(DiscoverQuizOption option) {
        DiscoverQuizOptionResponse response = new DiscoverQuizOptionResponse();
        response.setUuid(option.getUuid());
        response.setOptionGroup(option.getOptionGroup());
        response.setKey(option.getOptionKey());
        response.setLabel(option.getLabel());
        response.setHint(option.getHint());
        response.setIconKey(option.getIconKey());
        response.setCode(option.getCode());
        response.setSortOrder(option.getSortOrder());
        response.setActive(option.isActive());
        return response;
    }

    private String normalizeGroup(String group) {
        if (group == null || group.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "optionGroup is required");
        }
        String normalized = group.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_GROUPS.contains(normalized)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "Invalid optionGroup: " + group);
        }
        return normalized;
    }

    private String normalizeKey(String key) {
        if (key == null || key.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, "optionKey is required");
        }
        return key.trim().toUpperCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
