package com.thdpv.movietheater.mission.service;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MissionScoreService {

    private static final String MISSION_REWARD_TYPE = "MISSION_REWARD";

    private final BookingNativeRepository bookingNativeRepository;

    @Transactional
    public void grantMissionReward(UUID userUuid, int points, UUID userMissionUuid, String missionTitle, OffsetDateTime at) {
        if (userMissionUuid == null) {
            return;
        }

        UUID historyUuid = missionRewardHistoryUuid(userMissionUuid);
        if (bookingNativeRepository.existsScoreHistoryByUuid(historyUuid)) {
            return;
        }

        if (points > 0) {
            bookingNativeRepository.addUserScore(userUuid, points);
            bookingNativeRepository.addLifetimeScore(userUuid, points);
            bookingNativeRepository.queryInsertScoreHistory(
                    historyUuid,
                    userUuid,
                    points,
                    MISSION_REWARD_TYPE,
                    "Hoàn thành nhiệm vụ: " + missionTitle,
                    at);
        }
    }

    @Transactional(readOnly = true)
    public long getTotalMissionPointsAwarded() {
        return bookingNativeRepository.sumMissionRewardPoints();
    }

    static UUID missionRewardHistoryUuid(UUID userMissionUuid) {
        return UUID.nameUUIDFromBytes(
                ("mission-reward:" + userMissionUuid).getBytes(StandardCharsets.UTF_8));
    }

    static UUID missionRevokeHistoryUuid(UUID userMissionUuid) {
        return UUID.nameUUIDFromBytes(
                ("mission-revoke:" + userMissionUuid).getBytes(StandardCharsets.UTF_8));
    }

    @Transactional
    public void revokeMissionReward(UUID userUuid, int points, UUID userMissionUuid, String missionTitle, OffsetDateTime at) {
        if (userMissionUuid == null || userUuid == null) {
            return;
        }

        UUID rewardUuid = missionRewardHistoryUuid(userMissionUuid);
        if (!bookingNativeRepository.existsScoreHistoryByUuid(rewardUuid)) {
            return;
        }

        UUID revokeUuid = missionRevokeHistoryUuid(userMissionUuid);
        if (bookingNativeRepository.existsScoreHistoryByUuid(revokeUuid)) {
            return;
        }

        if (points > 0) {
            bookingNativeRepository.addUserScore(userUuid, -points);
            bookingNativeRepository.addLifetimeScore(userUuid, -points);
            bookingNativeRepository.queryInsertScoreHistory(
                    revokeUuid,
                    userUuid,
                    -points,
                    "MISSION_REVERSAL",
                    "Hoàn tác nhiệm vụ: " + missionTitle,
                    at != null ? at : OffsetDateTime.now());
        }
    }
}
