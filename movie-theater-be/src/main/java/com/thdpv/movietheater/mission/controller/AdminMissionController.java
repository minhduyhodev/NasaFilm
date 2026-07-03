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
import com.thdpv.movietheater.mission.dto.request.AdminMissionCampaignRequest;
import com.thdpv.movietheater.mission.dto.request.AdminMissionTemplateRequest;
import com.thdpv.movietheater.mission.dto.response.AdminMissionCampaignResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionTemplateResponse;
import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.service.MissionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/missions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminMissionController {

    private final MissionService missionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminMissionTemplateResponse>>> listTemplates() {
        return ResponseEntity.ok(ApiResponse.success(missionService.listTemplatesForAdmin()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MissionTemplate>> upsertTemplate(
            @Valid @RequestBody AdminMissionTemplateRequest request) {
        MissionTemplate saved = missionService.upsertTemplate(request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Lưu mission template thành công"));
    }

    @GetMapping("/campaigns")
    public ResponseEntity<ApiResponse<List<AdminMissionCampaignResponse>>> listCampaigns() {
        return ResponseEntity.ok(ApiResponse.success(missionService.listCampaignsForAdmin()));
    }

    @PostMapping("/campaigns")
    public ResponseEntity<ApiResponse<MissionCampaign>> upsertCampaign(
            @Valid @RequestBody AdminMissionCampaignRequest request) {
        MissionCampaign saved = missionService.upsertCampaign(request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Lưu chiến dịch mission thành công"));
    }
}
