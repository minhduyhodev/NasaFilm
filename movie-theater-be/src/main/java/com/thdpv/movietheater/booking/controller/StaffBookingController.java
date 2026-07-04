package com.thdpv.movietheater.booking.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.booking.dto.CounterBookingConfirmRequest;
import com.thdpv.movietheater.booking.dto.response.BookingResponse;
import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.common.response.ApiResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/staff/bookings")
public class StaffBookingController {

    private final BookingService bookingService;

    public StaffBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmCounterBooking(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CounterBookingConfirmRequest request) {
        BookingResponse response = bookingService.confirmCounterBooking(
                userDetails != null ? userDetails.getUsername() : null,
                request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }
}
