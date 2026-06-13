package com.thdpv.movietheater.cinema.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.cinema.dto.request.CinemaRequest;
import com.thdpv.movietheater.cinema.dto.request.CinemaRoomRequest;
import com.thdpv.movietheater.cinema.dto.response.CinemaResponse;
import com.thdpv.movietheater.cinema.dto.response.CinemaRoomResponse;
import com.thdpv.movietheater.cinema.service.CinemaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CinemaController {

    private final CinemaService cinemaService;

    @PostMapping("/admin/cinemas")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CinemaResponse>> createCinema(@Valid @RequestBody CinemaRequest request) {
        CinemaResponse response = cinemaService.createCinema(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/cinemas/{cinemaUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CinemaResponse>> updateCinema(
            @PathVariable UUID cinemaUuid,
            @Valid @RequestBody CinemaRequest request) {
        CinemaResponse response = cinemaService.updateCinema(cinemaUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/cinemas")
    public ResponseEntity<ApiResponse<Page<CinemaResponse>>> getCinemas(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<CinemaResponse> response = cinemaService.getCinemas(keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/cinemas/{cinemaUuid}")
    public ResponseEntity<ApiResponse<CinemaResponse>> getCinemaDetail(@PathVariable UUID cinemaUuid) {
        CinemaResponse response = cinemaService.getCinemaDetail(cinemaUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/admin/cinemas/{cinemaUuid}/rooms")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> createRoom(
            @PathVariable UUID cinemaUuid,
            @Valid @RequestBody CinemaRoomRequest request) {
        CinemaRoomResponse response = cinemaService.createRoom(cinemaUuid, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/rooms/{roomUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<CinemaRoomResponse>> updateRoom(
            @PathVariable UUID roomUuid,
            @Valid @RequestBody CinemaRoomRequest request) {
        CinemaRoomResponse response = cinemaService.updateRoom(roomUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/cinemas/{cinemaUuid}/rooms")
    public ResponseEntity<ApiResponse<List<CinemaRoomResponse>>> getRoomsByCinema(@PathVariable UUID cinemaUuid) {
        List<CinemaRoomResponse> response = cinemaService.getRoomsByCinema(cinemaUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/admin/rooms/{roomUuid}/seats/generate")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Void>> generateSeats(@PathVariable UUID roomUuid) {
        cinemaService.generateNasaStandardSeats(roomUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Sinh sơ đồ ghế chuẩn NASA thành công"));
    }
}
