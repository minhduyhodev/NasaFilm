package com.thdpv.movietheater.orbit.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.mission.service.MissionService;
import com.thdpv.movietheater.orbit.repository.OrbitMemberRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OrbitRoomMissionHelper {

    private final OrbitMemberRepository orbitMemberRepository;
    private final MissionService missionService;

    public void rollbackAllMemberProgress(UUID roomUuid, OffsetDateTime now) {
        orbitMemberRepository.findByRoomUuidOrderByJoinedAtAsc(roomUuid).forEach(member ->
                missionService.rollbackSourceProgress(member.getUserUuid(), roomUuid.toString(), now));
    }
}
