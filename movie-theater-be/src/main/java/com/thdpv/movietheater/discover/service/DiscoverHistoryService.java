package com.thdpv.movietheater.discover.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.discover.dto.response.AdminDiscoverAnalyticsResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverDistributionItemResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchItemResponse;
import com.thdpv.movietheater.discover.dto.response.DiscoverMatchResponse;
import com.thdpv.movietheater.discover.entity.UserMatchmakerHistory;
import com.thdpv.movietheater.discover.repository.UserMatchmakerHistoryRepository;
import com.thdpv.movietheater.mission.dto.MissionEventPayload;
import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.radar.support.ShowtimeRadarGenreCodec;

@Service
public class DiscoverHistoryService {

    private static final Map<String, String> MOOD_LABELS = Map.of(
            "RELAX", "Thư giãn",
            "EXCITING", "Phấn khích",
            "EMOTIONAL", "Cảm xúc",
            "THRILLING", "Hồi hộp");

    private static final Map<String, String> VIEWING_LABELS = Map.of(
            "THEATER", "Rạp chiếu",
            "HOME", "Xem tại nhà",
            "BOTH", "Hybrid");

    private final UserMatchmakerHistoryRepository historyRepository;
    private final MissionService missionService;

    public DiscoverHistoryService(
            UserMatchmakerHistoryRepository historyRepository,
            MissionService missionService) {
        this.historyRepository = historyRepository;
        this.missionService = missionService;
    }

    @Transactional
    public UUID recordSession(UUID userUuid, DiscoverMatchRequest request, DiscoverMatchResponse response) {
        OffsetDateTime now = OffsetDateTime.now();
        UUID sessionUuid = UUID.randomUUID();

        List<UUID> matchedMovieUuids = response.getMatches().stream()
                .map(DiscoverMatchItemResponse::getUuid)
                .toList();

        UserMatchmakerHistory history = new UserMatchmakerHistory();
        history.setUuid(sessionUuid);
        history.setUserUuid(userUuid);
        history.setMood(normalize(request.getMood()));
        history.setDuration(normalize(request.getDuration()));
        history.setViewingLocation(normalize(request.getViewingLocation()));
        history.setGenreUuids(ShowtimeRadarGenreCodec.encode(request.getGenreUuids()));
        history.setUseHistory(Boolean.TRUE.equals(request.getUseHistory()));
        history.setFlightCode(response.getFlightCode());
        history.setMatchCount(response.getMatches().size());
        history.setMatchedMovieUuids(ShowtimeRadarGenreCodec.encode(matchedMovieUuids));
        if (!response.getMatches().isEmpty()) {
            DiscoverMatchItemResponse top = response.getMatches().get(0);
            history.setTopMatchMovieUuid(top.getUuid());
            history.setTopMatchScore(top.getMatchScore());
        }
        history.setCreatedAt(now);
        historyRepository.save(history);

        if (userUuid != null) {
            missionService.handleEvent(MissionEventPayload.discoverQuizCompleted(userUuid, sessionUuid, now));
        }

        return sessionUuid;
    }

    @Transactional(readOnly = true)
    public AdminDiscoverAnalyticsResponse getAdminAnalytics() {
        long total = historyRepository.count();
        long authenticated = historyRepository.countByUserUuidIsNotNull();
        long guest = historyRepository.countByUserUuidIsNull();
        long last7Days = historyRepository.countByCreatedAtAfter(OffsetDateTime.now().minusDays(7));

        return new AdminDiscoverAnalyticsResponse(
                total,
                authenticated,
                guest,
                last7Days,
                buildDistribution(historyRepository.countGroupByMood(), MOOD_LABELS, total),
                buildDistribution(historyRepository.countGroupByViewingLocation(), VIEWING_LABELS, total));
    }

    private List<DiscoverDistributionItemResponse> buildDistribution(
            List<Object[]> rows,
            Map<String, String> labels,
            long total) {
        return rows.stream()
                .map(row -> {
                    String key = String.valueOf(row[0]);
                    long count = ((Number) row[1]).longValue();
                    double percentage = total > 0 ? (count * 100.0) / total : 0.0;
                    return new DiscoverDistributionItemResponse(
                            key,
                            labels.getOrDefault(key, key),
                            count,
                            Math.round(percentage * 10.0) / 10.0);
                })
                .toList();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
