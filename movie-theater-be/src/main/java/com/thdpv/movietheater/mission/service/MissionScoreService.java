package com.thdpv.movietheater.mission.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MissionScoreService {

    private final BookingNativeRepository bookingNativeRepository;

    @Transactional
    public void grantMissionReward(UUID userUuid, int points, UUID userMissionUuid, String missionTitle, OffsetDateTime at) {
        if (points <= 0) {
            return;
        }
        bookingNativeRepository.addUserScore(userUuid, points);
        bookingNativeRepository.addLifetimeScore(userUuid, points);
        bookingNativeRepository.queryInsertScoreHistory(
                UUID.randomUUID(),
                userUuid,
                points,
                "MISSION_REWARD",
                "Hoàn thành nhiệm vụ: " + missionTitle,
                at);
    }
}
