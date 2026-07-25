package com.thdpv.movietheater.mission.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.mission.dto.response.MissionBadgeResponse;
import com.thdpv.movietheater.mission.dto.response.MissionBoardResponse;
import com.thdpv.movietheater.mission.service.MissionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class MissionUserController {

    private final MissionService missionService;

    @GetMapping("/missions")
    public ResponseEntity<ApiResponse<MissionBoardResponse>> getMissions(
            @AuthenticationPrincipal UserDetails userDetails) {
        MissionBoardResponse board = missionService.getMissionBoard(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(board));
    }

    @GetMapping("/badges")
    public ResponseEntity<ApiResponse<List<MissionBadgeResponse>>> getBadges(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<MissionBadgeResponse> badges = missionService.getUserBadges(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(badges));
    }
}
