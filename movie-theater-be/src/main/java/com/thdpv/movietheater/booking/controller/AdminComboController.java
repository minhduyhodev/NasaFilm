package com.thdpv.movietheater.booking.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.thdpv.movietheater.booking.dto.request.ComboRequest;
import com.thdpv.movietheater.booking.dto.response.ComboRevenueResponse;
import com.thdpv.movietheater.booking.dto.response.RevenueSeriesResponse;
import com.thdpv.movietheater.booking.entity.Combo;
import com.thdpv.movietheater.booking.service.ComboRevenueService;
import com.thdpv.movietheater.booking.service.ComboService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/combos")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class AdminComboController {

    private final ComboService comboService;
    private final ComboRevenueService comboRevenueService;

    @GetMapping("/revenue/stats")
    public ResponseEntity<ApiResponse<ComboRevenueResponse>> getRevenueStats() {
        return ResponseEntity.ok(ApiResponse.success(comboRevenueService.getRevenueStats()));
    }

    @GetMapping("/revenue/series")
    public ResponseEntity<ApiResponse<RevenueSeriesResponse>> getRevenueSeries(
            @RequestParam(defaultValue = "day") String granularity,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(ApiResponse.success(
                comboRevenueService.getRevenueSeries(granularity, offset, date)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Combo>>> getAllCombos() {
        List<Combo> combos = comboService.getAllCombos();
        return ResponseEntity.ok(ApiResponse.success(combos));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('COMBO_WRITE')")
    public ResponseEntity<ApiResponse<Combo>> createCombo(@Valid @RequestBody ComboRequest request) {
        Combo combo = comboService.createCombo(request);
        return ResponseEntity.ok(ApiResponse.success(combo));
    }

    @PutMapping("/{uuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('COMBO_WRITE')")
    public ResponseEntity<ApiResponse<Combo>> updateCombo(
            @PathVariable UUID uuid,
            @Valid @RequestBody ComboRequest request) {
        Combo combo = comboService.updateCombo(uuid, request);
        return ResponseEntity.ok(ApiResponse.success(combo));
    }

    @DeleteMapping("/{uuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('COMBO_WRITE')")
    public ResponseEntity<ApiResponse<String>> deleteCombo(@PathVariable UUID uuid) {
        comboService.deleteCombo(uuid);
        return ResponseEntity.ok(ApiResponse.success("Xóa combo thành công"));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('COMBO_WRITE')")
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = comboService.uploadImage(file);
        return ResponseEntity.ok(ApiResponse.success(imageUrl));
    }
}
