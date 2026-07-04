package com.thdpv.movietheater.mission.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.mission.dto.MissionEventPayload;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.mission.dto.request.AdminMissionCampaignRequest;
import com.thdpv.movietheater.mission.dto.request.AdminMissionTemplateRequest;
import com.thdpv.movietheater.mission.dto.request.DuplicateMissionTemplateRequest;
import com.thdpv.movietheater.mission.dto.response.AdminMissionAnalyticsResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionCampaignResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionCampaignStatResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionTemplateResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionTemplateStatResponse;
import com.thdpv.movietheater.mission.dto.response.MissionBadgeResponse;
import com.thdpv.movietheater.mission.dto.response.MissionBoardResponse;
import com.thdpv.movietheater.mission.dto.response.MissionBoardSummaryResponse;
import com.thdpv.movietheater.mission.dto.response.MissionCampaignResponse;
import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;
import com.thdpv.movietheater.mission.dto.response.MissionItemResponse;
import com.thdpv.movietheater.mission.dto.response.MissionProgressResponse;
import com.thdpv.movietheater.mission.dto.response.MissionTierResponse;
import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.entity.MissionProgressEvent;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.entity.UserBadge;
import com.thdpv.movietheater.mission.entity.UserMission;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;
import com.thdpv.movietheater.mission.enums.MissionConditionType;
import com.thdpv.movietheater.mission.enums.MissionEventType;
import com.thdpv.movietheater.mission.enums.MissionRecurrence;
import com.thdpv.movietheater.mission.enums.UserMissionStatus;
import com.thdpv.movietheater.mission.repository.MissionCampaignRepository;
import com.thdpv.movietheater.mission.repository.MissionProgressEventRepository;
import com.thdpv.movietheater.mission.repository.MissionTemplateRepository;
import com.thdpv.movietheater.mission.repository.UserBadgeRepository;
import com.thdpv.movietheater.mission.repository.UserMissionRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.entity.MovieReview;
import com.thdpv.movietheater.movie.repository.MovieGenreRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.booking.util.MemberTierUtils;
import com.thdpv.movietheater.notification.dto.CreateUserNotificationRequest;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.mission.util.MissionConditionValidator;
import com.thdpv.movietheater.mission.util.MissionCycleResolver;
import com.thdpv.movietheater.mission.util.MissionRules;

@Service
public class MissionService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int EXPLORER_WINDOW_DAYS = 30;
    private static final int PREMIERE_WINDOW_DAYS = 3;
    private static final String FEATURE_ORBIT_SEAT = "ORBIT_SEAT";

    private final MissionTemplateRepository missionTemplateRepository;
    private final MissionCampaignRepository missionCampaignRepository;
    private final UserMissionRepository userMissionRepository;
    private final MissionProgressEventRepository missionProgressEventRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final MovieGenreRepository movieGenreRepository;
    private final BookingRepository bookingRepository;
    private final MovieReviewRepository movieReviewRepository;
    private final MissionScoreService missionScoreService;
    private final UserNotificationService userNotificationService;
    private final ObjectMapper objectMapper;

    @Value("${app.missions.orbit-seat-enabled:false}")
    private boolean orbitSeatEnabled;

    public MissionService(
            MissionTemplateRepository missionTemplateRepository,
            MissionCampaignRepository missionCampaignRepository,
            UserMissionRepository userMissionRepository,
            MissionProgressEventRepository missionProgressEventRepository,
            UserBadgeRepository userBadgeRepository,
            UserRepository userRepository,
            MovieRepository movieRepository,
            MovieGenreRepository movieGenreRepository,
            BookingRepository bookingRepository,
            MovieReviewRepository movieReviewRepository,
            MissionScoreService missionScoreService,
            UserNotificationService userNotificationService,
            ObjectMapper objectMapper) {
        this.missionTemplateRepository = missionTemplateRepository;
        this.missionCampaignRepository = missionCampaignRepository;
        this.userMissionRepository = userMissionRepository;
        this.missionProgressEventRepository = missionProgressEventRepository;
        this.userBadgeRepository = userBadgeRepository;
        this.userRepository = userRepository;
        this.movieRepository = movieRepository;
        this.movieGenreRepository = movieGenreRepository;
        this.bookingRepository = bookingRepository;
        this.movieReviewRepository = movieReviewRepository;
        this.missionScoreService = missionScoreService;
        this.userNotificationService = userNotificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public MissionBoardResponse getMissionBoard(String userEmail) {
        User user = resolveUser(userEmail);
        OffsetDateTime now = OffsetDateTime.now();
        Map<UUID, MissionCampaign> campaignsById = missionCampaignRepository.findAll().stream()
                .collect(Collectors.toMap(MissionCampaign::getUuid, campaign -> campaign, (a, b) -> a));

        List<MissionTemplate> templates = missionTemplateRepository
                .findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc().stream()
                .filter(template -> MissionRules.isTemplateVisible(template, campaignsById, now))
                .toList();

        Map<String, UserMission> missionsByKey = userMissionRepository.findByUserUuidOrderByUpdatedAtDesc(user.getId())
                .stream()
                .collect(Collectors.toMap(
                        mission -> mission.getMissionTemplateUuid() + "::" + mission.getCycleKey(),
                        mission -> mission,
                        (a, b) -> a));

        MissionBoardResponse board = new MissionBoardResponse();
        board.setTier(buildTier(user.getLifetimeScore() != null ? user.getLifetimeScore() : 0));
        board.setCampaign(resolveFeaturedCampaign(campaignsById, now));
        board.setBadges(getUserBadges(userEmail));

        List<MissionItemResponse> activeMissions = new ArrayList<>();
        List<MissionItemResponse> completedMissions = new ArrayList<>();

        for (MissionTemplate template : templates) {
            String cycleKey = MissionCycleResolver.resolve(template.getRecurrence(), now);
            UserMission userMission = missionsByKey.get(template.getUuid() + "::" + cycleKey);
            MissionItemResponse item = toMissionItem(template, userMission, cycleKey, now);

            if (isFeatureLocked(template)) {
                activeMissions.add(item);
                continue;
            }

            boolean completedThisCycle = userMission != null && userMission.getStatus() == UserMissionStatus.COMPLETED;
            if (completedThisCycle) {
                completedMissions.add(item);
            } else {
                activeMissions.add(item);
            }

            if (template.getRecurrence() == MissionRecurrence.ONCE) {
                continue;
            }

            missionsByKey.values().stream()
                    .filter(mission -> mission.getMissionTemplateUuid().equals(template.getUuid()))
                    .filter(mission -> mission.getStatus() == UserMissionStatus.COMPLETED)
                    .filter(mission -> !mission.getCycleKey().equals(cycleKey))
                    .sorted((a, b) -> {
                        if (a.getCompletedAt() == null || b.getCompletedAt() == null) {
                            return 0;
                        }
                        return b.getCompletedAt().compareTo(a.getCompletedAt());
                    })
                    .limit(3)
                    .map(mission -> toMissionItem(template, mission, mission.getCycleKey(), now))
                    .forEach(historyItem -> {
                        if (completedMissions.stream().noneMatch(existing -> existing.getCode().equals(historyItem.getCode())
                                && Objects.equals(existing.getCycleKey(), historyItem.getCycleKey()))) {
                            completedMissions.add(historyItem);
                        }
                    });
        }

        board.setActiveMissions(activeMissions);
        board.setCompletedMissions(completedMissions);
        board.getMissions().addAll(activeMissions);
        board.getMissions().addAll(completedMissions);
        board.setRecentCompletions(buildRecentCompletions(user.getId(), templates));
        board.setSummary(new MissionBoardSummaryResponse(
                (int) activeMissions.stream().filter(item -> !"LOCKED_FEATURE".equals(item.getVisibility())).count(),
                completedMissions.size(),
                templates.size(),
                !templates.isEmpty()
                        && activeMissions.stream().noneMatch(item -> !"LOCKED_FEATURE".equals(item.getVisibility()))
                        && completedMissions.size() >= templates.stream().filter(t -> !isFeatureLocked(t)).count()));
        return board;
    }

    @Transactional(readOnly = true)
    public List<MissionBadgeResponse> getUserBadges(String userEmail) {
        User user = resolveUser(userEmail);
        return userBadgeRepository.findByUserUuidOrderByUnlockedAtDesc(user.getId()).stream()
                .map(badge -> new MissionBadgeResponse(badge.getBadgeCode(), badge.getBadgeTitle()))
                .toList();
    }

    @Transactional
    public List<MissionCompletionResponse> handleEvent(MissionEventPayload event) {
        if (event == null || event.getUserUuid() == null || event.getEventType() == null) {
            return List.of();
        }

        List<MissionCompletionResponse> completions = new ArrayList<>();
        List<MissionTemplate> templates = missionTemplateRepository
                .findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc();
        Map<UUID, MissionCampaign> campaigns = loadCampaignMap();
        OffsetDateTime eventTime = event.getOccurredAt() != null ? event.getOccurredAt() : OffsetDateTime.now();

        for (MissionTemplate template : templates) {
            if (!supportsEvent(template, event)) {
                continue;
            }
            if (isFeatureLocked(template)) {
                continue;
            }
            if (!isEligibleForTemplate(template, event)) {
                continue;
            }

            if (!MissionRules.isTemplateVisible(template, campaigns, eventTime)) {
                continue;
            }

            String cycleKey = MissionCycleResolver.resolve(template.getRecurrence(), event.getOccurredAt());
            UserMission userMission = resolveUserMissionForUpdate(event.getUserUuid(), template, cycleKey);
            if (userMission.getStatus() == UserMissionStatus.COMPLETED) {
                continue;
            }
            if (!recordProgressEvent(event, template, cycleKey)) {
                continue;
            }

            applyProgress(template, userMission, event);
            userMissionRepository.save(userMission);

            if (userMission.getStatus() == UserMissionStatus.COMPLETED) {
                MissionCompletionResponse completion = completeMission(userMission, template, event.getOccurredAt());
                if (completion != null) {
                    completions.add(completion);
                }
            }
        }
        return completions;
    }

    @Transactional
    public MissionTemplate upsertTemplate(AdminMissionTemplateRequest request) {
        validateTemplateRequest(request);

        MissionTemplate template = missionTemplateRepository
                .findByCodeIgnoreCase(request.getCode().trim())
                .orElseGet(MissionTemplate::new);

        boolean isNew = template.getUuid() == null;
        MissionConditionType previousConditionType = template.getConditionType();
        int previousTargetValue = template.getTargetValue();
        String previousConditionJson = template.getConditionJson();
        int previousVersion = template.getVersion();

        template.setCode(request.getCode().trim().toUpperCase());
        template.setTitle(request.getTitle().trim());
        template.setDescription(request.getDescription());
        template.setConditionType(request.getConditionType());
        template.setConditionJson(request.getConditionJson());
        template.setRecurrence(request.getRecurrence() != null ? request.getRecurrence() : MissionRecurrence.ONCE);
        template.setCampaignUuid(request.getCampaignUuid());
        template.setStartsAt(request.getStartsAt());
        template.setEndsAt(request.getEndsAt());
        template.setRewardPoints(Math.max(request.getRewardPoints(), 0));
        template.setRewardBadgeCode(blankToNull(request.getRewardBadgeCode()));
        template.setRewardBadgeTitle(blankToNull(request.getRewardBadgeTitle()));
        template.setRequiresFeature(blankToNull(request.getRequiresFeature()));
        template.setTargetValue(Math.max(request.getTargetValue(), 1));
        template.setActive(request.isActive());
        template.setSortOrder(request.getSortOrder());
        template.setDeletedAt(null);
        if (isNew || previousVersion <= 0) {
            template.setVersion(1);
        } else if (hasMaterialTemplateChange(
                previousConditionType,
                previousTargetValue,
                previousConditionJson,
                template)) {
            template.setVersion(previousVersion + 1);
        } else {
            template.setVersion(previousVersion);
        }
        return missionTemplateRepository.save(template);
    }

    private boolean hasMaterialTemplateChange(
            MissionConditionType previousConditionType,
            int previousTargetValue,
            String previousConditionJson,
            MissionTemplate updated) {
        if (previousConditionType != updated.getConditionType()) {
            return true;
        }
        if (previousTargetValue != updated.getTargetValue()) {
            return true;
        }
        return !Objects.equals(
                normalizeConditionJson(previousConditionJson),
                normalizeConditionJson(updated.getConditionJson()));
    }

    private String normalizeConditionJson(String conditionJson) {
        if (conditionJson == null || conditionJson.isBlank()) {
            return "{}";
        }
        return conditionJson.trim();
    }

    @Transactional
    public AdminMissionTemplateResponse upsertTemplateForAdmin(AdminMissionTemplateRequest request) {
        return toAdminTemplateResponse(upsertTemplate(request));
    }

    @Transactional(readOnly = true)
    public List<AdminMissionTemplateResponse> listTemplatesForAdmin(boolean deletedOnly) {
        Page<AdminMissionTemplateResponse> page = listTemplatesForAdmin(deletedOnly, null, PageRequest.of(0, 500));
        return page.getContent();
    }

    @Transactional(readOnly = true)
    public Page<AdminMissionTemplateResponse> listTemplatesForAdmin(
            boolean deletedOnly, String query, Pageable pageable) {
        String needle = normalizeAdminQuery(query);
        Pageable safePageable = sanitizeTemplatePageable(pageable, deletedOnly);
        Page<MissionTemplate> templates = deletedOnly
                ? missionTemplateRepository.searchDeletedForAdmin(needle, safePageable)
                : missionTemplateRepository.searchActiveForAdmin(needle, safePageable);
        return templates.map(this::toAdminTemplateResponse);
    }

    @Transactional(readOnly = true)
    public AdminMissionAnalyticsResponse getAdminAnalytics() {
        AdminMissionAnalyticsResponse analytics = new AdminMissionAnalyticsResponse();
        long activeTemplateCount = missionTemplateRepository.countByDeletedAtIsNull();
        long deletedTemplateCount = missionTemplateRepository.countByDeletedAtIsNotNull();
        analytics.setTotalTemplates(activeTemplateCount + deletedTemplateCount);
        analytics.setActiveTemplates(missionTemplateRepository.countByActiveTrueAndDeletedAtIsNull());
        analytics.setDeletedTemplates(deletedTemplateCount);
        analytics.setTotalCampaigns(missionCampaignRepository.count());
        analytics.setLiveCampaigns(missionCampaignRepository.countByStatus(MissionCampaignStatus.ACTIVE));

        long enrollments = userMissionRepository.count();
        long completions = userMissionRepository.countByStatus(UserMissionStatus.COMPLETED);
        analytics.setTotalEnrollments(enrollments);
        analytics.setTotalCompletions(completions);
        analytics.setDistinctParticipants(userMissionRepository.countDistinctUserUuid());
        analytics.setTotalPointsAwarded(missionScoreService.getTotalMissionPointsAwarded());
        analytics.setOverallCompletionRate(enrollments > 0 ? (completions * 100.0) / enrollments : 0.0);

        List<AdminMissionTemplateStatResponse> topTemplates = missionTemplateRepository
                .findByDeletedAtIsNullOrderBySortOrderAscTitleAsc()
                .stream()
                .map(template -> {
                    long enrolled = userMissionRepository.countByMissionTemplateUuid(template.getUuid());
                    long completed = userMissionRepository.countByMissionTemplateUuidAndStatus(
                            template.getUuid(), UserMissionStatus.COMPLETED);
                    double rate = enrolled > 0 ? (completed * 100.0) / enrolled : 0.0;
                    return new AdminMissionTemplateStatResponse(
                            template.getCode(), template.getTitle(), enrolled, completed, rate);
                })
                .sorted(Comparator.comparingLong(AdminMissionTemplateStatResponse::getCompletedCount).reversed()
                        .thenComparing(Comparator.comparingLong(AdminMissionTemplateStatResponse::getEnrolledCount)
                                .reversed()))
                .limit(5)
                .toList();
        analytics.setTopTemplates(topTemplates);

        List<AdminMissionCampaignStatResponse> campaignStats = missionCampaignRepository
                .findAllByOrderBySortOrderAscTitleAsc()
                .stream()
                .map(campaign -> new AdminMissionCampaignStatResponse(
                        campaign.getUuid(),
                        campaign.getCode(),
                        campaign.getTitle(),
                        campaign.getStatus() != null ? campaign.getStatus().name() : MissionCampaignStatus.DRAFT.name(),
                        missionTemplateRepository.countByCampaignUuidAndDeletedAtIsNull(campaign.getUuid()),
                        userMissionRepository.countByCampaignUuid(campaign.getUuid()),
                        userMissionRepository.countByCampaignUuidAndStatus(
                                campaign.getUuid(), UserMissionStatus.COMPLETED)))
                .toList();
        analytics.setCampaignStats(campaignStats);
        return analytics;
    }

    @Transactional
    public AdminMissionTemplateResponse softDeleteTemplate(String code) {
        MissionTemplate template = missionTemplateRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(code.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy nhiệm vụ"));
        template.setDeletedAt(OffsetDateTime.now());
        template.setActive(false);
        return toAdminTemplateResponse(missionTemplateRepository.save(template));
    }

    @Transactional
    public AdminMissionTemplateResponse restoreTemplate(String code) {
        MissionTemplate template = missionTemplateRepository
                .findByCodeIgnoreCase(code.trim())
                .filter(MissionTemplate::isDeleted)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy nhiệm vụ đã xóa"));
        template.setDeletedAt(null);
        return toAdminTemplateResponse(missionTemplateRepository.save(template));
    }

    @Transactional
    public MissionCampaign upsertCampaign(AdminMissionCampaignRequest request) {
        MissionCampaign campaign = missionCampaignRepository
                .findByCodeIgnoreCase(request.getCode().trim())
                .orElseGet(MissionCampaign::new);
        campaign.setCode(request.getCode().trim().toUpperCase());
        campaign.setTitle(request.getTitle().trim());
        campaign.setDescription(request.getDescription());
        campaign.setStatus(request.getStatus() != null ? request.getStatus() : MissionCampaignStatus.DRAFT);
        campaign.setStartsAt(request.getStartsAt());
        campaign.setEndsAt(request.getEndsAt());
        campaign.setSortOrder(request.getSortOrder());
        return missionCampaignRepository.save(campaign);
    }

    @Transactional
    public AdminMissionCampaignResponse upsertCampaignForAdmin(AdminMissionCampaignRequest request) {
        return toAdminCampaignResponse(upsertCampaign(request));
    }

    @Transactional(readOnly = true)
    public List<AdminMissionCampaignResponse> listCampaignsForAdmin() {
        return listCampaignsForAdmin(null, PageRequest.of(0, 200)).getContent();
    }

    @Transactional(readOnly = true)
    public Page<AdminMissionCampaignResponse> listCampaignsForAdmin(String query, Pageable pageable) {
        String needle = normalizeAdminQuery(query);
        Pageable safePageable = sanitizeCampaignPageable(pageable);
        return missionCampaignRepository.searchForAdmin(needle, safePageable).map(this::toAdminCampaignResponse);
    }

    @Transactional
    public List<MissionCompletionResponse> handleOrbitRoomJoined(UUID userUuid, UUID roomUuid, OffsetDateTime at) {
        if (userUuid == null || roomUuid == null) {
            return List.of();
        }
        return handleEvent(MissionEventPayload.orbitRoomJoined(userUuid, roomUuid, at));
    }

    /**
     * Proxy for Orbit until a dedicated room module exists: group theater bookings (2+ seats)
     * count as joining an Orbit room when {@code app.missions.orbit-seat-enabled=true}.
     */
    @Transactional
    public List<MissionCompletionResponse> tryOrbitFromGroupBooking(
            UUID userUuid, UUID bookingUuid, int seatCount, OffsetDateTime at) {
        if (!orbitSeatEnabled || seatCount < 2 || userUuid == null || bookingUuid == null) {
            return List.of();
        }
        return handleOrbitRoomJoined(userUuid, bookingUuid, at);
    }

    /**
     * Rebuilds mission progress after a booking is cancelled/refunded by removing events tied to the booking.
     */
    @Transactional
    public void rollbackBookingProgress(UUID userUuid, UUID bookingUuid, OffsetDateTime at) {
        if (userUuid == null || bookingUuid == null) {
            return;
        }
        rollbackReversibleSourceProgress(
                userUuid,
                bookingUuid.toString(),
                BOOKING_ROLLBACK_SOURCE_TYPES,
                at);
    }

    /**
     * Rolls back progress for a reversible source. Review progress is immutable once recorded
     * (report/hide moderation does not revoke mission credit).
     */
    @Transactional
    public void rollbackSourceProgress(UUID userUuid, String sourceId, OffsetDateTime at) {
        rollbackReversibleSourceProgress(userUuid, sourceId, null, at);
    }

    private static final List<String> BOOKING_ROLLBACK_SOURCE_TYPES = List.of(
            MissionEventType.THEATER_BOOKING_CONFIRMED.name(),
            MissionEventType.VOD_PURCHASE_CONFIRMED.name(),
            MissionEventType.VOD_FIRST_PLAY.name(),
            MissionEventType.ORBIT_ROOM_JOINED.name());

    private void rollbackReversibleSourceProgress(
            UUID userUuid, String sourceId, List<String> allowedSourceTypes, OffsetDateTime at) {
        if (userUuid == null || sourceId == null || sourceId.isBlank()) {
            return;
        }

        List<MissionProgressEvent> sourceEvents =
                missionProgressEventRepository.findByUserUuidAndSourceId(userUuid, sourceId);
        if (sourceEvents.isEmpty()) {
            return;
        }

        List<MissionProgressEvent> removedEvents = sourceEvents.stream()
                .filter(event -> !MissionRules.isImmutableProgressSource(event.getSourceType()))
                .filter(event -> allowedSourceTypes == null || allowedSourceTypes.contains(event.getSourceType()))
                .toList();
        if (removedEvents.isEmpty()) {
            return;
        }

        Set<String> affectedKeys = new LinkedHashSet<>();
        for (MissionProgressEvent event : removedEvents) {
            affectedKeys.add(event.getMissionTemplateUuid() + "||" + event.getCycleKey());
        }

        List<String> sourceTypesToDelete = removedEvents.stream()
                .map(MissionProgressEvent::getSourceType)
                .distinct()
                .toList();
        missionProgressEventRepository.deleteByUserUuidAndSourceIdAndSourceTypeIn(
                userUuid, sourceId, sourceTypesToDelete);

        OffsetDateTime rollbackAt = at != null ? at : OffsetDateTime.now();
        for (String key : affectedKeys) {
            int splitAt = key.indexOf("||");
            if (splitAt <= 0) {
                continue;
            }
            UUID templateUuid = UUID.fromString(key.substring(0, splitAt));
            String cycleKey = key.substring(splitAt + 2);
            recalculateUserMissionProgress(userUuid, templateUuid, cycleKey, rollbackAt);
        }
    }

    @Transactional
    public AdminMissionTemplateResponse duplicateTemplate(String sourceCode, DuplicateMissionTemplateRequest request) {
        MissionTemplate source = missionTemplateRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(sourceCode.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy nhiệm vụ nguồn"));
        String newCode = request.getNewCode().trim().toUpperCase();
        if (missionTemplateRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(newCode).isPresent()) {
            throw new AppException(ErrorCode.CONFLICT, "Mã nhiệm vụ đã tồn tại");
        }

        AdminMissionTemplateRequest copy = new AdminMissionTemplateRequest();
        copy.setCode(newCode);
        copy.setTitle(source.getTitle() + " (bản sao)");
        copy.setDescription(source.getDescription());
        copy.setConditionType(source.getConditionType());
        copy.setConditionJson(source.getConditionJson());
        copy.setRecurrence(source.getRecurrence());
        copy.setCampaignUuid(source.getCampaignUuid());
        copy.setStartsAt(source.getStartsAt());
        copy.setEndsAt(source.getEndsAt());
        copy.setRewardPoints(source.getRewardPoints());
        copy.setRewardBadgeCode(source.getRewardBadgeCode());
        copy.setRewardBadgeTitle(source.getRewardBadgeTitle());
        copy.setRequiresFeature(source.getRequiresFeature());
        copy.setTargetValue(source.getTargetValue());
        copy.setActive(false);
        copy.setSortOrder(source.getSortOrder());
        return upsertTemplateForAdmin(copy);
    }

    @Transactional
    public AdminMissionCampaignResponse archiveCampaign(UUID campaignUuid) {
        MissionCampaign campaign = missionCampaignRepository
                .findById(campaignUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy chiến dịch"));
        campaign.setStatus(MissionCampaignStatus.ARCHIVED);
        return toAdminCampaignResponse(missionCampaignRepository.save(campaign));
    }

    @Transactional
    public void deleteCampaign(UUID campaignUuid) {
        MissionCampaign campaign = missionCampaignRepository
                .findById(campaignUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy chiến dịch"));
        long linkedTemplates = missionTemplateRepository.countByCampaignUuidAndDeletedAtIsNull(campaignUuid);
        if (linkedTemplates > 0) {
            throw new AppException(
                    ErrorCode.CONFLICT,
                    "Không thể xóa chiến dịch đang gắn " + linkedTemplates + " nhiệm vụ. Gỡ liên kết hoặc lưu trữ.");
        }
        missionCampaignRepository.delete(campaign);
    }

    private UserMission resolveUserMissionForUpdate(UUID userUuid, MissionTemplate template, String cycleKey) {
        Optional<UserMission> locked = userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                userUuid, template.getUuid(), cycleKey);
        UserMission userMission;
        if (locked.isPresent()) {
            userMission = locked.get();
        } else {
            enrollIfNeeded(userUuid, template, cycleKey);
            userMission = userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                    userUuid, template.getUuid(), cycleKey)
                    .orElseThrow(() -> new IllegalStateException("Không thể ghi nhận tiến độ nhiệm vụ."));
        }
        syncUserMissionWithTemplate(userMission, template);
        return userMission;
    }

    private void syncUserMissionWithTemplate(UserMission userMission, MissionTemplate template) {
        if (userMission.getStatus() == UserMissionStatus.COMPLETED) {
            return;
        }
        if (userMission.getTemplateVersion() == template.getVersion()) {
            if (userMission.getProgressTarget() != template.getTargetValue()) {
                userMission.setProgressTarget(template.getTargetValue());
            }
            return;
        }
        userMission.setTemplateVersion(template.getVersion());
        userMission.setProgressTarget(template.getTargetValue());
        userMission.setProgressCurrent(0);
        userMission.setProgressJson("{}");
        userMission.setStatus(isFeatureLocked(template) ? UserMissionStatus.LOCKED : UserMissionStatus.IN_PROGRESS);
    }

    private UserMission enrollIfNeeded(UUID userUuid, MissionTemplate template, String cycleKey) {
        Optional<UserMission> existing = userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                userUuid, template.getUuid(), cycleKey);
        if (existing.isPresent()) {
            return existing.get();
        }

        UserMission mission = new UserMission();
        mission.setUserUuid(userUuid);
        mission.setMissionTemplateUuid(template.getUuid());
        mission.setCycleKey(cycleKey);
        mission.setTemplateVersion(template.getVersion());
        mission.setProgressTarget(template.getTargetValue());
        if (isFeatureLocked(template)) {
            mission.setStatus(UserMissionStatus.LOCKED);
        } else {
            mission.setStatus(UserMissionStatus.IN_PROGRESS);
        }
        mission.setProgressCurrent(0);
        mission.setProgressJson("{}");
        try {
            return userMissionRepository.save(mission);
        } catch (DataIntegrityViolationException ex) {
            return userMissionRepository
                    .findByUserUuidAndMissionTemplateUuidAndCycleKey(userUuid, template.getUuid(), cycleKey)
                    .orElseThrow(() -> ex);
        }
    }

    private void validateTemplateRequest(AdminMissionTemplateRequest request) {
        MissionConditionValidator.validate(request.getConditionType(), request.getConditionJson());
        if (request.getCampaignUuid() != null) {
            missionCampaignRepository
                    .findById(request.getCampaignUuid())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy chiến dịch."));
        }
        if (request.getStartsAt() != null
                && request.getEndsAt() != null
                && request.getEndsAt().isBefore(request.getStartsAt())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
    }

    private void recalculateUserMissionProgress(
            UUID userUuid, UUID templateUuid, String cycleKey, OffsetDateTime at) {
        MissionTemplate template = missionTemplateRepository.findById(templateUuid).orElse(null);
        if (template == null) {
            return;
        }

        UserMission userMission = userMissionRepository
                .findByUserUuidAndMissionTemplateUuidAndCycleKey(userUuid, templateUuid, cycleKey)
                .orElse(null);
        if (userMission == null) {
            return;
        }

        boolean wasCompleted = userMission.getStatus() == UserMissionStatus.COMPLETED;

        userMission.setStatus(
                isFeatureLocked(template) ? UserMissionStatus.LOCKED : UserMissionStatus.IN_PROGRESS);
        userMission.setProgressCurrent(0);
        userMission.setProgressTarget(template.getTargetValue());
        userMission.setProgressJson("{}");
        userMission.setCompletedAt(null);

        List<MissionProgressEvent> remainingEvents = missionProgressEventRepository
                .findByUserUuidAndMissionTemplateUuidAndCycleKeyOrderByEventAtAsc(
                        userUuid, templateUuid, cycleKey);

        for (MissionProgressEvent progressEvent : remainingEvents) {
            MissionEventPayload payload = toEventPayload(progressEvent);
            if (payload == null) {
                continue;
            }
            if (!supportsEvent(template, payload)) {
                continue;
            }
            boolean immutableReview = MissionRules.isImmutableProgressSource(progressEvent.getSourceType());
            if (!immutableReview && !isEligibleForTemplate(template, payload)) {
                continue;
            }
            applyProgress(template, userMission, payload);
        }

        userMissionRepository.save(userMission);

        if (wasCompleted && userMission.getStatus() != UserMissionStatus.COMPLETED) {
            missionScoreService.revokeMissionReward(
                    userUuid,
                    template.getRewardPoints(),
                    userMission.getUuid(),
                    template.getTitle(),
                    at);
            revokeMissionBadge(userMission);
        }
    }

    private MissionEventPayload toEventPayload(MissionProgressEvent progressEvent) {
        MissionEventType eventType;
        try {
            eventType = MissionEventType.valueOf(progressEvent.getSourceType());
        } catch (IllegalArgumentException ex) {
            return null;
        }

        UUID userUuid = progressEvent.getUserUuid();
        String sourceId = progressEvent.getSourceId();
        OffsetDateTime occurredAt = progressEvent.getEventAt();
        UUID sourceUuid;
        try {
            sourceUuid = UUID.fromString(sourceId);
        } catch (IllegalArgumentException ex) {
            return null;
        }

        UUID movieUuid = progressEvent.getMovieUuid();
        if (movieUuid == null) {
            movieUuid = resolveMovieUuidForProgressEvent(eventType, sourceUuid);
        }
        return switch (eventType) {
            case THEATER_BOOKING_CONFIRMED -> MissionEventPayload.theaterBooking(
                    userUuid, sourceUuid, movieUuid, occurredAt);
            case VOD_PURCHASE_CONFIRMED -> MissionEventPayload.vodPurchase(
                    userUuid, sourceUuid, movieUuid, occurredAt);
            case VOD_FIRST_PLAY -> MissionEventPayload.vodFirstPlay(userUuid, sourceUuid, movieUuid, occurredAt);
            case REVIEW_WITH_VIBE_TAG_CREATED -> MissionEventPayload.reviewWithVibeTag(
                    userUuid, sourceUuid, movieUuid, occurredAt);
            case ORBIT_ROOM_JOINED -> MissionEventPayload.orbitRoomJoined(userUuid, sourceUuid, occurredAt);
            case DISCOVER_QUIZ_COMPLETED -> MissionEventPayload.discoverQuizCompleted(
                    userUuid, sourceUuid, occurredAt);
        };
    }

    private UUID resolveMovieUuidForProgressEvent(MissionEventType eventType, UUID sourceUuid) {
        return switch (eventType) {
            case THEATER_BOOKING_CONFIRMED, VOD_PURCHASE_CONFIRMED, VOD_FIRST_PLAY, ORBIT_ROOM_JOINED ->
                    resolveMovieUuidFromBooking(sourceUuid);
            case REVIEW_WITH_VIBE_TAG_CREATED -> movieReviewRepository
                    .findById(sourceUuid)
                    .map(MovieReview::getMovieUuid)
                    .orElse(null);
            case DISCOVER_QUIZ_COMPLETED -> null;
        };
    }

    private UUID resolveMovieUuidFromBooking(UUID bookingUuid) {
        return bookingRepository
                .findById(bookingUuid)
                .map(Booking::getMovieUuid)
                .orElse(null);
    }

    private void revokeMissionBadge(UserMission userMission) {
        userBadgeRepository
                .findBySourceUserMissionUuid(userMission.getUuid())
                .ifPresent(userBadgeRepository::delete);
    }

    private boolean recordProgressEvent(MissionEventPayload event, MissionTemplate template, String cycleKey) {
        if (missionProgressEventRepository.existsByUserUuidAndMissionTemplateUuidAndCycleKeyAndSourceTypeAndSourceId(
                event.getUserUuid(),
                template.getUuid(),
                cycleKey,
                event.getEventType().name(),
                event.getSourceId())) {
            return false;
        }

        MissionProgressEvent progressEvent = new MissionProgressEvent();
        progressEvent.setUserUuid(event.getUserUuid());
        progressEvent.setMissionTemplateUuid(template.getUuid());
        progressEvent.setCycleKey(cycleKey);
        progressEvent.setSourceType(event.getEventType().name());
        progressEvent.setSourceId(event.getSourceId());
        progressEvent.setMovieUuid(event.getMovieUuid());
        progressEvent.setEventAt(event.getOccurredAt() != null ? event.getOccurredAt() : OffsetDateTime.now());
        try {
            missionProgressEventRepository.save(progressEvent);
            return true;
        } catch (DataIntegrityViolationException ex) {
            return false;
        }
    }

    private void applyProgress(MissionTemplate template, UserMission userMission, MissionEventPayload event) {
        switch (template.getConditionType()) {
            case GENRE_WINDOW -> applyExplorerProgress(template, userMission, event);
            case PREMIERE_BOOKING -> applyPremiereProgress(userMission);
            case HYBRID_THEATER_VOD -> applyHybridProgress(userMission, event);
            case REVIEW_WITH_VIBE_TAG -> applyReviewerProgress(userMission);
            case ORBIT_ROOM_JOIN -> applySingleStepProgress(userMission);
            case MATCHMAKER_QUIZ -> applyReviewerProgress(userMission);
            default -> {
            }
        }
    }

    private void applyExplorerProgress(MissionTemplate template, UserMission userMission, MissionEventPayload event) {
        if (event.getMovieUuid() == null) {
            return;
        }
        ExplorerProgress progress = readExplorerProgress(userMission.getProgressJson());
        int windowDays = MissionRules.resolveWindowDays(template.getConditionJson(), EXPLORER_WINDOW_DAYS);
        OffsetDateTime cutoff = (event.getOccurredAt() != null ? event.getOccurredAt() : OffsetDateTime.now())
                .minusDays(windowDays);
        progress.genreEvents.removeIf(item -> item.at == null || item.at.isBefore(cutoff));

        List<UUID> genreIds = movieGenreRepository.findByMovie_Uuid(event.getMovieUuid()).stream()
                .map(MovieGenre::getGenre)
                .filter(genre -> genre != null && genre.getUuid() != null)
                .map(genre -> genre.getUuid())
                .distinct()
                .toList();

        OffsetDateTime at = event.getOccurredAt() != null ? event.getOccurredAt() : OffsetDateTime.now();
        for (UUID genreId : genreIds) {
            boolean exists = progress.genreEvents.stream().anyMatch(item -> genreId.equals(item.genreId));
            if (!exists) {
                progress.genreEvents.add(new GenreEvent(genreId, at));
            }
        }

        userMission.setProgressJson(writeExplorerProgress(progress));
        int current = progress.genreEvents.size();
        userMission.setProgressCurrent(Math.min(current, template.getTargetValue()));
        if (current >= template.getTargetValue()) {
            userMission.setStatus(UserMissionStatus.COMPLETED);
            userMission.setCompletedAt(OffsetDateTime.now());
        }
    }

    private void applyPremiereProgress(UserMission userMission) {
        userMission.setProgressCurrent(1);
        userMission.setProgressTarget(1);
        userMission.setStatus(UserMissionStatus.COMPLETED);
        userMission.setCompletedAt(OffsetDateTime.now());
    }

    private void applyHybridProgress(UserMission userMission, MissionEventPayload event) {
        HybridProgress progress = readHybridProgress(userMission.getProgressJson());
        if (event.getMovieUuid() == null) {
            return;
        }
        if (event.getEventType() == MissionEventType.THEATER_BOOKING_CONFIRMED) {
            progress.theaterMovies.add(event.getMovieUuid().toString());
        } else if (event.getEventType() == MissionEventType.VOD_PURCHASE_CONFIRMED) {
            progress.vodMovies.add(event.getMovieUuid().toString());
        }

        userMission.setProgressJson(writeHybridProgress(progress));
        Set<String> theater = new HashSet<>(progress.theaterMovies);
        Set<String> vod = new HashSet<>(progress.vodMovies);
        theater.retainAll(vod);
        int matched = theater.size();
        userMission.setProgressCurrent(matched > 0 ? 1 : 0);
        if (matched > 0) {
            userMission.setStatus(UserMissionStatus.COMPLETED);
            userMission.setCompletedAt(OffsetDateTime.now());
        }
    }

    private void applyReviewerProgress(UserMission userMission) {
        int next = userMission.getProgressCurrent() + 1;
        userMission.setProgressCurrent(Math.min(next, userMission.getProgressTarget()));
        if (next >= userMission.getProgressTarget()) {
            userMission.setStatus(UserMissionStatus.COMPLETED);
            userMission.setCompletedAt(OffsetDateTime.now());
        }
    }

    private void applySingleStepProgress(UserMission userMission) {
        userMission.setProgressCurrent(1);
        userMission.setStatus(UserMissionStatus.COMPLETED);
        userMission.setCompletedAt(OffsetDateTime.now());
    }

    private MissionCompletionResponse completeMission(
            UserMission userMission, MissionTemplate template, OffsetDateTime at) {
        if (userMission.getStatus() != UserMissionStatus.COMPLETED) {
            return null;
        }
        OffsetDateTime grantedAt = at != null ? at : OffsetDateTime.now();
        missionScoreService.grantMissionReward(
                userMission.getUserUuid(),
                template.getRewardPoints(),
                userMission.getUuid(),
                template.getTitle(),
                grantedAt);

        MissionBadgeResponse badgeResponse = null;
        if (template.getRewardBadgeCode() != null && !template.getRewardBadgeCode().isBlank()) {
            badgeResponse = grantBadge(userMission, template, grantedAt);
        }

        notifyCompletion(userMission.getUserUuid(), template, badgeResponse);
        return new MissionCompletionResponse(
                template.getCode(),
                template.getTitle(),
                template.getRewardPoints(),
                badgeResponse);
    }

    private MissionBadgeResponse grantBadge(UserMission userMission, MissionTemplate template, OffsetDateTime at) {
        Optional<UserBadge> existing = userBadgeRepository.findByUserUuidAndBadgeCodeIgnoreCase(
                userMission.getUserUuid(), template.getRewardBadgeCode());
        if (existing.isPresent()) {
            UserBadge badge = existing.get();
            return new MissionBadgeResponse(badge.getBadgeCode(), badge.getBadgeTitle());
        }

        UserBadge badge = new UserBadge();
        badge.setUserUuid(userMission.getUserUuid());
        badge.setBadgeCode(template.getRewardBadgeCode());
        badge.setBadgeTitle(
                template.getRewardBadgeTitle() != null ? template.getRewardBadgeTitle() : template.getRewardBadgeCode());
        badge.setSourceUserMissionUuid(userMission.getUuid());
        badge.setUnlockedAt(at);
        userBadgeRepository.save(badge);
        return new MissionBadgeResponse(badge.getBadgeCode(), badge.getBadgeTitle());
    }

    private void notifyCompletion(UUID userUuid, MissionTemplate template, MissionBadgeResponse badge) {
        try {
            User user = userRepository.findById(userUuid).orElse(null);
            if (user == null || user.getEmail() == null) {
                return;
            }
            StringBuilder content = new StringBuilder("Bạn nhận được +" + template.getRewardPoints() + " điểm NASA.");
            if (badge != null) {
                content.append(" Huy hiệu mới: ").append(badge.getTitle()).append('.');
            }
            CreateUserNotificationRequest request = new CreateUserNotificationRequest();
            request.setTitle("Hoàn thành nhiệm vụ: " + template.getTitle());
            request.setContent(content.toString());
            request.setType("success");
            request.setActionUrl("/profile?tab=missions");
            userNotificationService.createNotification(user.getEmail(), request);
        } catch (Exception ignored) {
            // Không chặn luồng chính nếu thông báo thất bại
        }
    }

    private boolean supportsEvent(MissionTemplate template, MissionEventPayload event) {
        return switch (template.getConditionType()) {
            case GENRE_WINDOW -> event.getEventType() == MissionEventType.THEATER_BOOKING_CONFIRMED
                    || event.getEventType() == MissionEventType.VOD_FIRST_PLAY;
            case PREMIERE_BOOKING -> event.getEventType() == MissionEventType.THEATER_BOOKING_CONFIRMED;
            case HYBRID_THEATER_VOD -> event.getEventType() == MissionEventType.THEATER_BOOKING_CONFIRMED
                    || event.getEventType() == MissionEventType.VOD_PURCHASE_CONFIRMED;
            case REVIEW_WITH_VIBE_TAG -> event.getEventType() == MissionEventType.REVIEW_WITH_VIBE_TAG_CREATED;
            case ORBIT_ROOM_JOIN -> event.getEventType() == MissionEventType.ORBIT_ROOM_JOINED;
            case MATCHMAKER_QUIZ -> event.getEventType() == MissionEventType.DISCOVER_QUIZ_COMPLETED;
        };
    }

    private boolean isEligibleForTemplate(MissionTemplate template, MissionEventPayload event) {
        if (event.getMovieUuid() == null) {
            return template.getConditionType() == MissionConditionType.REVIEW_WITH_VIBE_TAG
                    || template.getConditionType() == MissionConditionType.ORBIT_ROOM_JOIN
                    || template.getConditionType() == MissionConditionType.MATCHMAKER_QUIZ;
        }

        Movie movie = movieRepository.findById(event.getMovieUuid()).orElse(null);
        if (movie == null) {
            return false;
        }

        return switch (template.getConditionType()) {
            case PREMIERE_BOOKING -> isPremiereBooking(
                    movie,
                    event.getOccurredAt(),
                    MissionRules.resolveWindowDays(template.getConditionJson(), PREMIERE_WINDOW_DAYS));
            case GENRE_WINDOW, HYBRID_THEATER_VOD -> true;
            default -> true;
        };
    }

    private boolean isPremiereBooking(Movie movie, OffsetDateTime occurredAt, int windowDays) {
        if (movie.getReleaseDate() == null || occurredAt == null) {
            return false;
        }
        LocalDate releaseDate = movie.getReleaseDate();
        LocalDate bookingDate = occurredAt.atZoneSameInstant(VIETNAM_ZONE).toLocalDate();
        if (bookingDate.isBefore(releaseDate)) {
            return false;
        }
        return !bookingDate.isAfter(releaseDate.plusDays(windowDays));
    }

    private boolean isFeatureLocked(MissionTemplate template) {
        if (!FEATURE_ORBIT_SEAT.equalsIgnoreCase(template.getRequiresFeature())) {
            return false;
        }
        return !orbitSeatEnabled;
    }

    private Map<UUID, MissionCampaign> loadCampaignMap() {
        return missionCampaignRepository.findAll().stream()
                .collect(Collectors.toMap(MissionCampaign::getUuid, campaign -> campaign, (a, b) -> a));
    }

    private MissionCampaignResponse resolveFeaturedCampaign(Map<UUID, MissionCampaign> campaigns, OffsetDateTime now) {
        return campaigns.values().stream()
                .filter(campaign -> campaign.getStatus() == MissionCampaignStatus.ACTIVE)
                .filter(campaign -> campaign.getStartsAt() == null || !now.isBefore(campaign.getStartsAt()))
                .filter(campaign -> campaign.getEndsAt() == null || !now.isAfter(campaign.getEndsAt()))
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .findFirst()
                .map(campaign -> new MissionCampaignResponse(
                        campaign.getCode(),
                        campaign.getTitle(),
                        campaign.getDescription(),
                        campaign.getStartsAt(),
                        campaign.getEndsAt()))
                .orElse(null);
    }

    private List<MissionCompletionResponse> buildRecentCompletions(UUID userUuid, List<MissionTemplate> visibleTemplates) {
        Set<UUID> visibleIds = visibleTemplates.stream()
                .map(MissionTemplate::getUuid)
                .collect(Collectors.toSet());
        Map<UUID, MissionTemplate> templatesById = visibleTemplates.stream()
                .collect(Collectors.toMap(MissionTemplate::getUuid, template -> template, (a, b) -> a));
        return userMissionRepository
                .findByUserUuidAndStatusOrderByCompletedAtDesc(
                        userUuid, UserMissionStatus.COMPLETED, PageRequest.of(0, 8))
                .stream()
                .filter(mission -> visibleIds.contains(mission.getMissionTemplateUuid()))
                .map(mission -> {
                    MissionTemplate template = templatesById.get(mission.getMissionTemplateUuid());
                    if (template == null) {
                        return null;
                    }
                    MissionBadgeResponse badge = null;
                    if (template.getRewardBadgeCode() != null) {
                        badge = new MissionBadgeResponse(
                                template.getRewardBadgeCode(), template.getRewardBadgeTitle());
                    }
                    return new MissionCompletionResponse(
                            template.getCode(), template.getTitle(), template.getRewardPoints(), badge);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private AdminMissionTemplateResponse toAdminTemplateResponse(MissionTemplate template) {
        AdminMissionTemplateResponse response = new AdminMissionTemplateResponse();
        response.setUuid(template.getUuid());
        response.setCode(template.getCode());
        response.setVersion(template.getVersion());
        response.setTitle(template.getTitle());
        response.setDescription(template.getDescription());
        response.setConditionType(template.getConditionType());
        response.setConditionJson(template.getConditionJson());
        response.setRecurrence(template.getRecurrence());
        response.setCampaignUuid(template.getCampaignUuid());
        response.setStartsAt(template.getStartsAt());
        response.setEndsAt(template.getEndsAt());
        response.setRewardPoints(template.getRewardPoints());
        response.setRewardBadgeCode(template.getRewardBadgeCode());
        response.setRewardBadgeTitle(template.getRewardBadgeTitle());
        response.setRequiresFeature(template.getRequiresFeature());
        response.setTargetValue(template.getTargetValue());
        response.setActive(template.isActive());
        response.setSortOrder(template.getSortOrder());
        response.setDeletedAt(template.getDeletedAt());
        response.setEnrolledCount(userMissionRepository.countByMissionTemplateUuid(template.getUuid()));
        response.setCompletedCount(userMissionRepository.countByMissionTemplateUuidAndStatus(
                template.getUuid(), UserMissionStatus.COMPLETED));
        return response;
    }

    private AdminMissionCampaignResponse toAdminCampaignResponse(MissionCampaign campaign) {
        AdminMissionCampaignResponse response = new AdminMissionCampaignResponse();
        response.setUuid(campaign.getUuid());
        response.setCode(campaign.getCode());
        response.setTitle(campaign.getTitle());
        response.setDescription(campaign.getDescription());
        response.setStatus(campaign.getStatus());
        response.setStartsAt(campaign.getStartsAt());
        response.setEndsAt(campaign.getEndsAt());
        response.setSortOrder(campaign.getSortOrder());
        response.setTemplateCount(missionTemplateRepository.countByCampaignUuidAndDeletedAtIsNull(campaign.getUuid()));
        return response;
    }

    private MissionItemResponse toMissionItem(
            MissionTemplate template, UserMission userMission, String cycleKey, OffsetDateTime now) {
        MissionItemResponse item = new MissionItemResponse();
        item.setCode(template.getCode());
        item.setConditionType(
                template.getConditionType() != null ? template.getConditionType().name() : null);
        item.setTitle(template.getTitle());
        item.setDescription(template.getDescription());
        item.setRewardPoints(template.getRewardPoints());
        item.setSortOrder(template.getSortOrder());
        item.setCycleKey(cycleKey);
        item.setRecurrence(template.getRecurrence() != null ? template.getRecurrence().name() : MissionRecurrence.ONCE.name());
        if (template.getRewardBadgeCode() != null) {
            item.setRewardBadge(new MissionBadgeResponse(
                    template.getRewardBadgeCode(),
                    template.getRewardBadgeTitle()));
        }

        if (isFeatureLocked(template)) {
            item.setStatus(UserMissionStatus.LOCKED.name());
            item.setVisibility("LOCKED_FEATURE");
            item.setProgress(new MissionProgressResponse(0, template.getTargetValue(), progressUnit(template)));
            return item;
        }

        if (userMission == null) {
            item.setStatus(UserMissionStatus.IN_PROGRESS.name());
            item.setVisibility("ACTIVE");
            item.setProgress(new MissionProgressResponse(0, template.getTargetValue(), progressUnit(template)));
            return item;
        }

        item.setStatus(userMission.getStatus().name());
        item.setVisibility(userMission.getStatus() == UserMissionStatus.COMPLETED ? "COMPLETED" : "ACTIVE");
        item.setCompletedAt(userMission.getCompletedAt());
        if (userMission.getStatus() == UserMissionStatus.COMPLETED) {
            item.setProgress(null);
        } else {
            item.setProgress(new MissionProgressResponse(
                    userMission.getProgressCurrent(),
                    userMission.getProgressTarget(),
                    progressUnit(template)));
        }
        return item;
    }

    private String progressUnit(MissionTemplate template) {
        return switch (template.getConditionType()) {
            case GENRE_WINDOW -> "thể loại";
            case REVIEW_WITH_VIBE_TAG -> "review";
            case HYBRID_THEATER_VOD, PREMIERE_BOOKING, ORBIT_ROOM_JOIN, MATCHMAKER_QUIZ -> "lần";
        };
    }

    private MissionTierResponse buildTier(int lifetimeScore) {
        String code = MemberTierUtils.resolveTierCode(lifetimeScore);
        String label = MemberTierUtils.resolveTierLabel(lifetimeScore);
        int nextTierAt = lifetimeScore >= MemberTierUtils.TIER_VIP_MIN_SCORE
                ? MemberTierUtils.TIER_VIP_MIN_SCORE
                : lifetimeScore >= MemberTierUtils.TIER_FRIEND_MIN_SCORE
                        ? MemberTierUtils.TIER_VIP_MIN_SCORE
                        : MemberTierUtils.TIER_FRIEND_MIN_SCORE;
        return new MissionTierResponse(code, label, lifetimeScore, nextTierAt);
    }

    private User resolveUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new com.thdpv.movietheater.common.exception.AppException(
                        com.thdpv.movietheater.common.exception.ErrorCode.USER_NOT_FOUND));
    }

    private String normalizeAdminQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private Pageable sanitizeTemplatePageable(Pageable pageable, boolean deletedOnly) {
        int page = Math.max(pageable.getPageNumber(), 0);
        int size = pageable.getPageSize() > 0 ? Math.min(pageable.getPageSize(), 50) : 10;
        Sort sort = deletedOnly
                ? Sort.by(Sort.Direction.DESC, "deletedAt")
                : Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by("title"));
        return PageRequest.of(page, size, sort);
    }

    private Pageable sanitizeCampaignPageable(Pageable pageable) {
        int page = Math.max(pageable.getPageNumber(), 0);
        int size = pageable.getPageSize() > 0 ? Math.min(pageable.getPageSize(), 50) : 10;
        Sort sort = Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by("title"));
        return PageRequest.of(page, size, sort);
    }

    private ExplorerProgress readExplorerProgress(String json) {
        if (json == null || json.isBlank()) {
            return new ExplorerProgress();
        }
        try {
            return objectMapper.readValue(json, ExplorerProgress.class);
        } catch (Exception ex) {
            return new ExplorerProgress();
        }
    }

    private String writeExplorerProgress(ExplorerProgress progress) {
        try {
            return objectMapper.writeValueAsString(progress);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private HybridProgress readHybridProgress(String json) {
        if (json == null || json.isBlank()) {
            return new HybridProgress();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<HybridProgress>() {
            });
        } catch (Exception ex) {
            return new HybridProgress();
        }
    }

    private String writeHybridProgress(HybridProgress progress) {
        try {
            return objectMapper.writeValueAsString(progress);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static final class ExplorerProgress {
        public List<GenreEvent> genreEvents = new ArrayList<>();
    }

    private static final class GenreEvent {
        public UUID genreId;
        public OffsetDateTime at;

        public GenreEvent() {
        }

        public GenreEvent(UUID genreId, OffsetDateTime at) {
            this.genreId = genreId;
            this.at = at;
        }
    }

    private static final class HybridProgress {
        public Set<String> theaterMovies = new LinkedHashSet<>();
        public Set<String> vodMovies = new LinkedHashSet<>();
    }
}
