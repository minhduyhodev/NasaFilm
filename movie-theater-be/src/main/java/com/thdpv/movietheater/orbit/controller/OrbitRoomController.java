package com.thdpv.movietheater.orbit.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.orbit.dto.request.CreateOrbitRoomRequest;
import com.thdpv.movietheater.orbit.dto.request.UpdateOrbitMemberSeatsRequest;
import com.thdpv.movietheater.orbit.dto.response.OrbitCheckoutPrepareResponse;
import com.thdpv.movietheater.orbit.dto.response.OrbitRoomResponse;
import com.thdpv.movietheater.orbit.service.OrbitRoomService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/orbit-rooms")
@RequiredArgsConstructor
public class OrbitRoomController {

    private final OrbitRoomService orbitRoomService;

    @GetMapping("/feature-status")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getFeatureStatus() {
        return ResponseEntity.ok(ApiResponse.success(Map.of("enabled", orbitRoomService.isOrbitEnabled())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> createRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateOrbitRoomRequest request) {
        OrbitRoomResponse room = orbitRoomService.createRoom(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(room));
    }

    @PostMapping("/{roomUuid}/join")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> joinRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitRoomResponse room = orbitRoomService.joinRoom(userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @DeleteMapping("/{roomUuid}/leave")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> leaveRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitRoomResponse room = orbitRoomService.leaveRoom(userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @DeleteMapping("/{roomUuid}")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> cancelRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitRoomResponse room = orbitRoomService.cancelRoom(userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<OrbitRoomResponse>>> getActiveRooms(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<OrbitRoomResponse> rooms = orbitRoomService.getActiveRoomsForUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(rooms));
    }

    @GetMapping("/{roomUuid}")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> getRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitRoomResponse room = orbitRoomService.getRoom(userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @PutMapping("/{roomUuid}/seats")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> updateMemberSeats(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid,
            @Valid @RequestBody UpdateOrbitMemberSeatsRequest request) {
        OrbitRoomResponse room = orbitRoomService.updateMemberSeats(
                userDetails.getUsername(), roomUuid, request);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @PostMapping("/{roomUuid}/prepare-checkout")
    public ResponseEntity<ApiResponse<OrbitCheckoutPrepareResponse>> prepareCheckout(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitCheckoutPrepareResponse payload = orbitRoomService.prepareCheckout(
                userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(payload));
    }

    @PostMapping("/{roomUuid}/abort-checkout")
    public ResponseEntity<ApiResponse<OrbitRoomResponse>> abortCheckout(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID roomUuid) {
        OrbitRoomResponse room = orbitRoomService.abortCheckout(userDetails.getUsername(), roomUuid);
        return ResponseEntity.ok(ApiResponse.success(room));
    }
}
