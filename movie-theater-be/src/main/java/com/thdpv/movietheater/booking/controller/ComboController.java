package com.thdpv.movietheater.booking.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.ComboResponse;
import com.thdpv.movietheater.booking.service.ComboService;
import com.thdpv.movietheater.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
public class ComboController {

    private final ComboService comboService;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ComboResponse>>> getActiveCombos() {
        List<ComboResponse> responses = comboService.getActiveComboResponses();
        return ResponseEntity.ok(ApiResponse.success(responses));
    }
}
