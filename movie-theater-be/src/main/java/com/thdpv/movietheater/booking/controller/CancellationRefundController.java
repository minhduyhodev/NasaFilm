package com.thdpv.movietheater.booking.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.request.CancelBookingRequest;
import com.thdpv.movietheater.booking.dto.response.AdminRefundListItemResponse;
import com.thdpv.movietheater.booking.dto.response.CancelBookingResponse;
import com.thdpv.movietheater.booking.dto.response.CancellationPreviewResponse;
import com.thdpv.movietheater.booking.dto.response.RefundStatusResponse;
import com.thdpv.movietheater.booking.service.CancellationRefundService;
import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CancellationRefundController {

    private final CancellationRefundService cancellationRefundService;
    private final UserRepository userRepository;

    @GetMapping("/bookings/{id}/cancellation-preview")
    public ResponseEntity<ApiResponse<CancellationPreviewResponse>> getCancellationPreview(
            @PathVariable("id") UUID bookingUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        ActorContext actor = resolveActor(userDetails);
        CancellationPreviewResponse response = cancellationRefundService.getCancellationPreview(
                bookingUuid, actor.userUuid(), actor.adminOverride(), false);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/bookings/{id}/refund-status")
    public ResponseEntity<ApiResponse<RefundStatusResponse>> getRefundStatus(
            @PathVariable("id") UUID bookingUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        ActorContext actor = resolveActor(userDetails);
        RefundStatusResponse response = cancellationRefundService.getRefundStatus(
                bookingUuid, actor.userUuid(), actor.adminOverride());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/bookings/{id}/cancel")
    public ResponseEntity<ApiResponse<CancelBookingResponse>> cancelBooking(
            @PathVariable("id") UUID bookingUuid,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody(required = false) CancelBookingRequest request) {
        ActorContext actor = resolveActor(userDetails);
        String reason = request != null ? request.getReason() : null;
        CancelBookingResponse response = cancellationRefundService.cancelBooking(
                bookingUuid, actor.userUuid(), actor.role(), actor.adminOverride(), reason, false);
        return ResponseEntity.ok(ApiResponse.success(response, "Hủy đặt vé thành công"));
    }

    @GetMapping("/admin/refunds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminRefundListItemResponse>>> listPendingRefunds() {
        return ResponseEntity.ok(ApiResponse.success(cancellationRefundService.listPendingRefunds()));
    }

    @GetMapping("/admin/refunds/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminRefundListItemResponse>>> listRefundHistory() {
        return ResponseEntity.ok(ApiResponse.success(cancellationRefundService.listRefundHistory()));
    }

    @PostMapping("/admin/refunds/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> approveRefund(
            @PathVariable("id") UUID refundUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID adminUuid = resolveActor(userDetails).userUuid();
        cancellationRefundService.approveRefund(refundUuid, adminUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Duyệt hoàn tiền thành công"));
    }

    private ActorContext resolveActor(UserDetails userDetails) {
        if (userDetails == null) {
            return new ActorContext(null, "CUSTOMER", false);
        }
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElse(null);
        UUID userUuid = user != null ? user.getId() : null;
        boolean adminOverride = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_STAFF"));
        String role = adminOverride ? "ADMIN" : "CUSTOMER";
        return new ActorContext(userUuid, role, adminOverride);
    }

    private record ActorContext(UUID userUuid, String role, boolean adminOverride) {
    }
}
