package com.thdpv.movietheater.mission.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.mission.dto.request.AdminMissionCampaignRequest;
import com.thdpv.movietheater.mission.dto.request.AdminMissionTemplateRequest;
import com.thdpv.movietheater.mission.dto.request.DuplicateMissionTemplateRequest;
import com.thdpv.movietheater.mission.dto.response.AdminMissionCampaignResponse;
import com.thdpv.movietheater.mission.dto.response.AdminMissionTemplateResponse;
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
    public ResponseEntity<ApiResponse<List<AdminMissionTemplateResponse>>> listTemplates(
            @RequestParam(defaultValue = "false") boolean deleted) {
        return ResponseEntity.ok(ApiResponse.success(missionService.listTemplatesForAdmin(deleted)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminMissionTemplateResponse>> upsertTemplate(
            @Valid @RequestBody AdminMissionTemplateRequest request) {
        AdminMissionTemplateResponse saved = missionService.upsertTemplateForAdmin(request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Lưu mission template thành công"));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<AdminMissionTemplateResponse>> softDeleteTemplate(@PathVariable String code) {
        AdminMissionTemplateResponse deletedTemplate = missionService.softDeleteTemplate(code);
        return ResponseEntity.ok(ApiResponse.success(deletedTemplate, "Đã xóa nhiệm vụ"));
    }

    @PostMapping("/{code}/restore")
    public ResponseEntity<ApiResponse<AdminMissionTemplateResponse>> restoreTemplate(@PathVariable String code) {
        AdminMissionTemplateResponse restored = missionService.restoreTemplate(code);
        return ResponseEntity.ok(ApiResponse.success(restored, "Đã khôi phục nhiệm vụ"));
    }

    @PostMapping("/{code}/duplicate")
    public ResponseEntity<ApiResponse<AdminMissionTemplateResponse>> duplicateTemplate(
            @PathVariable String code,
            @Valid @RequestBody DuplicateMissionTemplateRequest request) {
        AdminMissionTemplateResponse duplicated = missionService.duplicateTemplate(code, request);
        return ResponseEntity.ok(ApiResponse.success(duplicated, "Nhân bản nhiệm vụ thành công"));
    }

    @GetMapping("/campaigns")
    public ResponseEntity<ApiResponse<List<AdminMissionCampaignResponse>>> listCampaigns() {
        return ResponseEntity.ok(ApiResponse.success(missionService.listCampaignsForAdmin()));
    }

    @PostMapping("/campaigns")
    public ResponseEntity<ApiResponse<AdminMissionCampaignResponse>> upsertCampaign(
            @Valid @RequestBody AdminMissionCampaignRequest request) {
        AdminMissionCampaignResponse saved = missionService.upsertCampaignForAdmin(request);
        return ResponseEntity.ok(ApiResponse.success(saved, "Lưu chiến dịch mission thành công"));
    }

    @PostMapping("/campaigns/{uuid}/archive")
    public ResponseEntity<ApiResponse<AdminMissionCampaignResponse>> archiveCampaign(@PathVariable UUID uuid) {
        AdminMissionCampaignResponse archived = missionService.archiveCampaign(uuid);
        return ResponseEntity.ok(ApiResponse.success(archived, "Đã lưu trữ chiến dịch"));
    }

    @DeleteMapping("/campaigns/{uuid}")
    public ResponseEntity<ApiResponse<Void>> deleteCampaign(@PathVariable UUID uuid) {
        missionService.deleteCampaign(uuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa chiến dịch"));
    }
}
