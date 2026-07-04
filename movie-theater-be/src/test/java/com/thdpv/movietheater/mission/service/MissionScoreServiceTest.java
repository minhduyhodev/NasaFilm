package com.thdpv.movietheater.mission.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;

@ExtendWith(MockitoExtension.class)
class MissionScoreServiceTest {

    @Mock
    private BookingNativeRepository bookingNativeRepository;

    @InjectMocks
    private MissionScoreService missionScoreService;

    @Test
    void grantMissionReward_skipsWhenHistoryAlreadyExists() {
        UUID userUuid = UUID.randomUUID();
        UUID userMissionUuid = UUID.randomUUID();
        UUID historyUuid = MissionScoreService.missionRewardHistoryUuid(userMissionUuid);

        when(bookingNativeRepository.existsScoreHistoryByUuid(historyUuid)).thenReturn(true);

        missionScoreService.grantMissionReward(userUuid, 100, userMissionUuid, "Khám phá phim", OffsetDateTime.now());

        verify(bookingNativeRepository, never()).addUserScore(any(), any(Integer.class));
        verify(bookingNativeRepository, never()).queryInsertScoreHistory(any(), any(), any(Integer.class), any(), any(), any());
    }

    @Test
    void grantMissionReward_usesDeterministicHistoryUuid() {
        UUID userUuid = UUID.randomUUID();
        UUID userMissionUuid = UUID.randomUUID();
        UUID historyUuid = MissionScoreService.missionRewardHistoryUuid(userMissionUuid);
        OffsetDateTime at = OffsetDateTime.parse("2026-07-01T12:00:00+07:00");

        when(bookingNativeRepository.existsScoreHistoryByUuid(historyUuid)).thenReturn(false);

        missionScoreService.grantMissionReward(userUuid, 150, userMissionUuid, "Suất chiếu đầu", at);

        verify(bookingNativeRepository).addUserScore(userUuid, 150);
        verify(bookingNativeRepository).addLifetimeScore(userUuid, 150);
        verify(bookingNativeRepository).queryInsertScoreHistory(
                eq(historyUuid),
                eq(userUuid),
                eq(150),
                eq("MISSION_REWARD"),
                eq("Hoàn thành nhiệm vụ: Suất chiếu đầu"),
                eq(at));
        assertEquals(historyUuid, MissionScoreService.missionRewardHistoryUuid(userMissionUuid));
    }

    @Test
    void revokeMissionReward_isIdempotentWhenAlreadyReversed() {
        UUID userUuid = UUID.randomUUID();
        UUID userMissionUuid = UUID.randomUUID();
        UUID rewardUuid = MissionScoreService.missionRewardHistoryUuid(userMissionUuid);
        UUID revokeUuid = MissionScoreService.missionRevokeHistoryUuid(userMissionUuid);

        when(bookingNativeRepository.existsScoreHistoryByUuid(rewardUuid)).thenReturn(true);
        when(bookingNativeRepository.existsScoreHistoryByUuid(revokeUuid)).thenReturn(true);

        missionScoreService.revokeMissionReward(userUuid, 100, userMissionUuid, "Suất chiếu đầu", OffsetDateTime.now());

        verify(bookingNativeRepository, never()).addUserScore(any(), any(Integer.class));
    }
}
