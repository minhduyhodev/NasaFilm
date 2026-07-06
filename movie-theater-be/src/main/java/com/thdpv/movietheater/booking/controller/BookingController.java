package com.thdpv.movietheater.booking.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;
import com.thdpv.movietheater.booking.dto.request.ConfirmOnlineBookingRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.dto.response.CheckInTicketResponse;
import com.thdpv.movietheater.booking.dto.response.CustomerBookingHistoryResponse;
import com.thdpv.movietheater.booking.dto.response.PurchaseHistoryResponse;
import com.thdpv.movietheater.booking.dto.response.AdminBookingListResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBooking(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ConfirmBookingRequest request) {
        BookingResponse response = bookingService.confirmBooking(
                userDetails != null ? userDetails.getUsername() : null,
                request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/confirm-online")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmOnlineBooking(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ConfirmOnlineBookingRequest request) {
        BookingResponse response = bookingService.confirmOnlineBooking(
                userDetails != null ? userDetails.getUsername() : null,
                request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<List<CustomerBookingHistoryResponse>>> getMyBookings(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<CustomerBookingHistoryResponse> response = bookingService.getMyBookings(
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/purchase-history")
    public ResponseEntity<ApiResponse<List<PurchaseHistoryResponse>>> getPurchaseHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<PurchaseHistoryResponse> response = bookingService.getPurchaseHistory(
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<List<AdminBookingListResponse>>> getAdminBookings(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {
        List<AdminBookingListResponse> response = bookingService.getAdminBookings(keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/tickets/{code}/check-in")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('TICKET_CHECKIN')")
    public ResponseEntity<ApiResponse<CheckInTicketResponse>> checkInTicket(
            @PathVariable("code") String code,
            @RequestParam(value = "currentRoomId", required = false) UUID currentRoomId) {
        CheckInTicketResponse response = bookingService.checkInTicket(code, currentRoomId);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }
}
