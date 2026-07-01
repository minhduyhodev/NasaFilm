package com.thdpv.movietheater.radar.service;

import java.util.ArrayList;
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
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.radar.dto.request.UpdateShowtimeRadarRequest;
import com.thdpv.movietheater.radar.dto.response.AdminShowtimeRadarPreferenceResponse;
import com.thdpv.movietheater.radar.entity.ShowtimeRadarPreference;
import com.thdpv.movietheater.radar.repository.ShowtimeRadarPreferenceRepository;
import com.thdpv.movietheater.radar.support.ShowtimeRadarGenreCodec;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class AdminShowtimeRadarService {

    private final ShowtimeRadarPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final GenreRepository genreRepository;
    private final ShowtimeRadarService showtimeRadarService;

    public AdminShowtimeRadarService(
            ShowtimeRadarPreferenceRepository preferenceRepository,
            UserRepository userRepository,
            GenreRepository genreRepository,
            ShowtimeRadarService showtimeRadarService) {
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
        this.genreRepository = genreRepository;
        this.showtimeRadarService = showtimeRadarService;
    }

    @Transactional(readOnly = true)
    public List<AdminShowtimeRadarPreferenceResponse> listPreferences(String query, Boolean enabled) {
        Map<UUID, User> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (left, right) -> left));
        Map<UUID, String> genreNamesByUuid = genreRepository.findAll().stream()
                .collect(Collectors.toMap(Genre::getUuid, Genre::getName, (left, right) -> left));

        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);

        return preferenceRepository.findByDeletedAtIsNullOrderByUpdatedAtDesc().stream()
                .map(preference -> toAdminResponse(preference, usersById.get(preference.getUserUuid()), genreNamesByUuid))
                .filter(response -> matchesEnabledFilter(response, enabled))
                .filter(response -> matchesQuery(response, normalizedQuery))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminShowtimeRadarPreferenceResponse getPreference(UUID userUuid) {
        ShowtimeRadarPreference preference = preferenceRepository.findByUserUuidAndDeletedAtIsNull(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy sở thích Radar của khách hàng"));
        User user = userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy khách hàng"));
        Map<UUID, String> genreNamesByUuid = genreRepository.findAll().stream()
                .collect(Collectors.toMap(Genre::getUuid, Genre::getName, (left, right) -> left));
        return toAdminResponse(preference, user, genreNamesByUuid);
    }

    @Transactional
    public AdminShowtimeRadarPreferenceResponse updatePreference(UUID userUuid, UpdateShowtimeRadarRequest request) {
        User user = userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy khách hàng"));
        showtimeRadarService.updatePreference(user.getEmail(), request);
        return getPreference(userUuid);
    }

    @Transactional
    public void deletePreference(UUID userUuid) {
        User user = userRepository.findById(userUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy khách hàng"));
        showtimeRadarService.softDeletePreference(user.getEmail());
    }

    private boolean matchesEnabledFilter(AdminShowtimeRadarPreferenceResponse response, Boolean enabled) {
        if (enabled == null) {
            return true;
        }
        return response.isEnabled() == enabled;
    }

    private boolean matchesQuery(AdminShowtimeRadarPreferenceResponse response, String normalizedQuery) {
        if (normalizedQuery.isEmpty()) {
            return true;
        }
        String email = response.getUserEmail() == null ? "" : response.getUserEmail().toLowerCase(Locale.ROOT);
        String fullName = response.getUserFullName() == null ? "" : response.getUserFullName().toLowerCase(Locale.ROOT);
        return email.contains(normalizedQuery) || fullName.contains(normalizedQuery);
    }

    private AdminShowtimeRadarPreferenceResponse toAdminResponse(
            ShowtimeRadarPreference preference,
            User user,
            Map<UUID, String> genreNamesByUuid) {
        List<UUID> genreUuids = ShowtimeRadarGenreCodec.decode(preference.getGenreUuids());
        List<String> genreNames = new ArrayList<>();
        for (UUID genreUuid : genreUuids) {
            String name = genreNamesByUuid.get(genreUuid);
            genreNames.add(name != null ? name : genreUuid.toString());
        }

        AdminShowtimeRadarPreferenceResponse response = new AdminShowtimeRadarPreferenceResponse();
        response.setUserUuid(preference.getUserUuid());
        response.setUserEmail(user != null ? user.getEmail() : null);
        response.setUserFullName(user != null ? user.getFullName() : "Khách không xác định");
        response.setEnabled(preference.isEnabled());
        response.setGenreUuids(genreUuids);
        response.setGenreNames(genreNames);
        response.setTimeSlotStartHour(preference.getTimeSlotStartHour());
        response.setTimeSlotEndHour(preference.getTimeSlotEndHour());
        response.setIncludeFavorites(preference.isIncludeFavorites());
        response.setUpdatedAt(preference.getUpdatedAt());
        return response;
    }
}
