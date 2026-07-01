package com.thdpv.movietheater.mission.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.mission.dto.request.AdminMissionTemplateRequest;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.service.MissionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/missions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMissionController {

    private final MissionService missionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MissionTemplate>>> listTemplates() {
        return ResponseEntity.ok(ApiResponse.success(missionService.listTemplatesForAdmin()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MissionTemplate>> upsertTemplate(
            @Valid @RequestBody AdminMissionTemplateRequest request) {
        MissionTemplate saved = missionService.upsertTemplate(request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Lưu mission template thành công"));
    }
}
