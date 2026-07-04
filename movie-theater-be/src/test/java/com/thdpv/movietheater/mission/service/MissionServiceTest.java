package com.thdpv.movietheater.mission.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.mission.dto.MissionEventPayload;
import com.thdpv.movietheater.mission.entity.MissionProgressEvent;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.entity.UserMission;
import com.thdpv.movietheater.mission.enums.MissionConditionType;
import com.thdpv.movietheater.mission.enums.MissionRecurrence;
import com.thdpv.movietheater.mission.enums.UserMissionStatus;
import com.thdpv.movietheater.mission.repository.MissionCampaignRepository;
import com.thdpv.movietheater.mission.repository.MissionProgressEventRepository;
import com.thdpv.movietheater.mission.repository.MissionTemplateRepository;
import com.thdpv.movietheater.mission.repository.UserBadgeRepository;
import com.thdpv.movietheater.mission.repository.UserMissionRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.movie.repository.MovieGenreRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.MovieReviewRepository;
import com.thdpv.movietheater.notification.service.UserNotificationService;
import com.thdpv.movietheater.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class MissionServiceTest {

    @Mock
    private MissionTemplateRepository missionTemplateRepository;
    @Mock
    private MissionCampaignRepository missionCampaignRepository;
    @Mock
    private UserMissionRepository userMissionRepository;
    @Mock
    private MissionProgressEventRepository missionProgressEventRepository;
    @Mock
    private UserBadgeRepository userBadgeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MovieRepository movieRepository;
    @Mock
    private MovieGenreRepository movieGenreRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private MovieReviewRepository movieReviewRepository;
    @Mock
    private MissionScoreService missionScoreService;
    @Mock
    private UserNotificationService userNotificationService;

    @InjectMocks
    private MissionService missionService;

    private final UUID userUuid = UUID.randomUUID();
    private final UUID templateUuid = UUID.randomUUID();
    private final UUID reviewUuid = UUID.randomUUID();
    private final UUID movieUuid = UUID.randomUUID();
    private final OffsetDateTime now = OffsetDateTime.parse("2026-07-01T12:00:00+07:00");

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(missionService, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(missionService, "orbitSeatEnabled", false);
    }

    @Test
    void handleEvent_enrollRace_reusesExistingMission() {
        MissionTemplate template = reviewerTemplate();
        UserMission existing = enrolledMission(0);

        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(template));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(new Movie()));
        when(userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty(), Optional.of(existing));
        when(userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty(), Optional.of(existing));
        when(userMissionRepository.save(any(UserMission.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate enrollment"))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(missionProgressEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.handleEvent(MissionEventPayload.reviewWithVibeTag(userUuid, reviewUuid, movieUuid, now));

        verify(userMissionRepository, times(2)).findByUserUuidAndMissionTemplateUuidAndCycleKey(
                userUuid, templateUuid, "ONCE");
        ArgumentCaptor<UserMission> captor = ArgumentCaptor.forClass(UserMission.class);
        verify(userMissionRepository, times(2)).save(captor.capture());
        assertEquals(1, captor.getAllValues().get(1).getProgressCurrent());
    }

    @Test
    void handleEvent_premiereBooking_completesMission() {
        UUID bookingUuid = UUID.randomUUID();
        MissionTemplate template = premiereTemplate();
        UserMission userMission = enrolledMission(0);
        Movie movie = premiereMovie();

        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(template));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(movie));
        when(userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty(), Optional.of(userMission));
        when(userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty());
        when(userMissionRepository.save(any(UserMission.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(missionProgressEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.handleEvent(MissionEventPayload.theaterBooking(userUuid, bookingUuid, movieUuid, now));

        ArgumentCaptor<UserMission> captor = ArgumentCaptor.forClass(UserMission.class);
        verify(userMissionRepository, times(2)).save(captor.capture());
        assertEquals(UserMissionStatus.COMPLETED, captor.getAllValues().get(1).getStatus());
    }

    @Test
    void rollbackSourceProgress_skipsImmutableReviewEvents() {
        UUID reviewUuid = UUID.randomUUID();
        MissionProgressEvent reviewEvent = new MissionProgressEvent();
        reviewEvent.setUserUuid(userUuid);
        reviewEvent.setMissionTemplateUuid(templateUuid);
        reviewEvent.setCycleKey("ONCE");
        reviewEvent.setSourceType("REVIEW_WITH_VIBE_TAG_CREATED");
        reviewEvent.setSourceId(reviewUuid.toString());
        reviewEvent.setMovieUuid(movieUuid);

        when(missionProgressEventRepository.findByUserUuidAndSourceId(userUuid, reviewUuid.toString()))
                .thenReturn(List.of(reviewEvent));

        missionService.rollbackSourceProgress(userUuid, reviewUuid.toString(), now);

        verify(missionProgressEventRepository, times(0)).deleteByUserUuidAndSourceIdAndSourceTypeIn(any(), any(), any());
        verify(userMissionRepository, times(0)).save(any());
    }

    @Test
    void rollbackBookingProgress_revertsCompletedPremiereMission() {
        UUID bookingUuid = UUID.randomUUID();
        MissionTemplate template = premiereTemplate();
        UserMission userMission = enrolledMission(1);
        userMission.setUuid(UUID.randomUUID());
        userMission.setStatus(UserMissionStatus.COMPLETED);
        userMission.setCompletedAt(now);

        MissionProgressEvent progressEvent = new MissionProgressEvent();
        progressEvent.setUserUuid(userUuid);
        progressEvent.setMissionTemplateUuid(templateUuid);
        progressEvent.setCycleKey("ONCE");
        progressEvent.setSourceType("THEATER_BOOKING_CONFIRMED");
        progressEvent.setSourceId(bookingUuid.toString());
        progressEvent.setEventAt(now);

        when(missionProgressEventRepository.findByUserUuidAndSourceId(userUuid, bookingUuid.toString()))
                .thenReturn(List.of(progressEvent));
        when(missionTemplateRepository.findById(templateUuid)).thenReturn(Optional.of(template));
        when(userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.of(userMission));
        when(missionProgressEventRepository.findByUserUuidAndMissionTemplateUuidAndCycleKeyOrderByEventAtAsc(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(List.of());
        when(userMissionRepository.save(any(UserMission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.rollbackBookingProgress(userUuid, bookingUuid, now);

        verify(missionProgressEventRepository).deleteByUserUuidAndSourceIdAndSourceTypeIn(
                eq(userUuid), eq(bookingUuid.toString()), eq(List.of("THEATER_BOOKING_CONFIRMED")));
        verify(missionScoreService).revokeMissionReward(
                eq(userUuid),
                eq(template.getRewardPoints()),
                eq(userMission.getUuid()),
                eq(template.getTitle()),
                eq(now));
        assertEquals(UserMissionStatus.IN_PROGRESS, userMission.getStatus());
        assertEquals(0, userMission.getProgressCurrent());
    }

    @Test
    void handleEvent_reviewWithVibeTag_incrementsProgress() {
        MissionTemplate template = reviewerTemplate();
        UserMission userMission = enrolledMission(0);

        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(template));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(new Movie()));
        when(userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty(), Optional.of(userMission));
        when(userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty());
        when(userMissionRepository.save(any(UserMission.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(missionProgressEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.handleEvent(MissionEventPayload.reviewWithVibeTag(userUuid, reviewUuid, movieUuid, now));

        ArgumentCaptor<UserMission> captor = ArgumentCaptor.forClass(UserMission.class);
        verify(userMissionRepository, times(2)).save(captor.capture());
        UserMission saved = captor.getAllValues().get(1);
        assertEquals(1, saved.getProgressCurrent());
        assertEquals(UserMissionStatus.IN_PROGRESS, saved.getStatus());
    }

    @Test
    void handleEvent_duplicateSourceId_doesNotDoubleProgress() {
        MissionTemplate template = reviewerTemplate();
        UserMission userMission = enrolledMission(1);

        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(template));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());
        when(movieRepository.findById(movieUuid)).thenReturn(Optional.of(new Movie()));
        when(userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.of(userMission));
        when(missionProgressEventRepository.save(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        missionService.handleEvent(MissionEventPayload.reviewWithVibeTag(userUuid, reviewUuid, movieUuid, now));

        verify(userMissionRepository, times(0)).save(any());
        assertEquals(1, userMission.getProgressCurrent());
    }

    @Test
    void handleOrbitRoomJoined_skippedWhenFeatureLocked() {
        MissionTemplate orbit = orbitTemplate();
        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(orbit));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());

        List<?> completions = missionService.handleOrbitRoomJoined(userUuid, UUID.randomUUID(), now);

        assertTrue(completions.isEmpty());
        verify(missionProgressEventRepository, times(0)).save(any());
    }

    @Test
    void tryOrbitFromGroupBooking_completesWhenEnabledAndMultipleSeats() {
        ReflectionTestUtils.setField(missionService, "orbitSeatEnabled", true);
        MissionTemplate orbit = orbitTemplate();
        UserMission userMission = enrolledMission(0);
        UUID bookingUuid = UUID.randomUUID();

        when(missionTemplateRepository.findByActiveTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()).thenReturn(List.of(orbit));
        when(missionCampaignRepository.findAll()).thenReturn(List.of());
        when(userMissionRepository.findWithLockByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty(), Optional.of(userMission));
        when(userMissionRepository.findByUserUuidAndMissionTemplateUuidAndCycleKey(
                        userUuid, templateUuid, "ONCE"))
                .thenReturn(Optional.empty());
        when(userMissionRepository.save(any(UserMission.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(missionProgressEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        missionService.tryOrbitFromGroupBooking(userUuid, bookingUuid, 2, now);

        ArgumentCaptor<UserMission> captor = ArgumentCaptor.forClass(UserMission.class);
        verify(userMissionRepository, times(2)).save(captor.capture());
        UserMission saved = captor.getAllValues().get(1);
        assertEquals(UserMissionStatus.COMPLETED, saved.getStatus());
        assertEquals(1, saved.getProgressCurrent());
    }

    private MissionTemplate premiereTemplate() {
        MissionTemplate template = new MissionTemplate();
        template.setUuid(templateUuid);
        template.setCode("PREMIERE");
        template.setTitle("Suất chiếu đầu");
        template.setActive(true);
        template.setVersion(1);
        template.setConditionType(MissionConditionType.PREMIERE_BOOKING);
        template.setConditionJson("{\"windowDays\":3}");
        template.setRecurrence(MissionRecurrence.ONCE);
        template.setTargetValue(1);
        template.setRewardPoints(200);
        return template;
    }

    private Movie premiereMovie() {
        Movie movie = new Movie();
        movie.setUuid(movieUuid);
        movie.setReleaseDate(LocalDate.of(2026, 6, 28));
        return movie;
    }

    private MissionTemplate reviewerTemplate() {
        MissionTemplate template = new MissionTemplate();
        template.setUuid(templateUuid);
        template.setCode("REVIEWER");
        template.setTitle("Nhà phê bình");
        template.setActive(true);
        template.setVersion(1);
        template.setConditionType(MissionConditionType.REVIEW_WITH_VIBE_TAG);
        template.setConditionJson("{}");
        template.setRecurrence(MissionRecurrence.ONCE);
        template.setTargetValue(5);
        return template;
    }

    private MissionTemplate orbitTemplate() {
        MissionTemplate template = new MissionTemplate();
        template.setUuid(templateUuid);
        template.setCode("SOCIAL_ORBIT");
        template.setTitle("Đặt vé nhóm");
        template.setActive(true);
        template.setVersion(1);
        template.setConditionType(MissionConditionType.ORBIT_ROOM_JOIN);
        template.setConditionJson("{}");
        template.setRecurrence(MissionRecurrence.ONCE);
        template.setRequiresFeature("ORBIT_SEAT");
        template.setTargetValue(1);
        return template;
    }

    private UserMission enrolledMission(int progressCurrent) {
        UserMission mission = new UserMission();
        mission.setUserUuid(userUuid);
        mission.setMissionTemplateUuid(templateUuid);
        mission.setCycleKey("ONCE");
        mission.setTemplateVersion(1);
        mission.setProgressCurrent(progressCurrent);
        mission.setProgressTarget(5);
        mission.setStatus(UserMissionStatus.IN_PROGRESS);
        mission.setProgressJson("{}");
        return mission;
    }
}
