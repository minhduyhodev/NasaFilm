package com.thdpv.movietheater.booking.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.response.ComboResponse;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
public class ComboController {

    private final BookingNativeRepository bookingRepository;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ComboResponse>>> getActiveCombos() {
        List<ComboResponse> responses = bookingRepository.loadActiveCombos().stream()
                .map(combo -> new ComboResponse(
                        combo.comboUuid(),
                        combo.name(),
                        combo.description(),
                        combo.unitPrice(),
                        combo.imageUrl(),
                        combo.status()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }
}
