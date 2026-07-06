package com.thdpv.movietheater.orbit.dto;

import java.util.List;

import com.thdpv.movietheater.mission.dto.response.MissionCompletionResponse;

public record OrbitBookingCompletionResult(
        int hostScoreAdded,
        List<MissionCompletionResponse> missionCompletions) {
}
