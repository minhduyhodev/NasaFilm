package com.thdpv.movietheater.preshow.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.preshow.dto.response.BoardingPassResponse;
import com.thdpv.movietheater.preshow.service.PreShowService;

@RestController
@RequestMapping("/api/pre-show")
public class PreShowController {

    private final PreShowService preShowService;

    public PreShowController(PreShowService preShowService) {
        this.preShowService = preShowService;
    }

    @GetMapping("/boarding/{bookingUuid}")
    public ResponseEntity<ApiResponse<BoardingPassResponse>> getBoardingPass(
            @PathVariable UUID bookingUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        BoardingPassResponse response = preShowService.getBoardingPass(
                bookingUuid, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
