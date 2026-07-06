package com.thdpv.movietheater.booking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.user.dto.CounterCreateCustomerRequest;
import com.thdpv.movietheater.user.dto.CounterCreateCustomerResponse;
import com.thdpv.movietheater.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/staff/customers")
public class StaffCustomerController {

    private final UserService userService;

    public StaffCustomerController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('COUNTER_CUSTOMER_CREATE')")
    public ResponseEntity<ApiResponse<CounterCreateCustomerResponse>> createCustomer(
            @Valid @RequestBody CounterCreateCustomerRequest request) {
        CounterCreateCustomerResponse response = userService.createCustomer(request);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    @GetMapping("/walk-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<ApiResponse<CounterCreateCustomerResponse>> getWalkInCustomer() {
        CounterCreateCustomerResponse response = userService.getWalkInCustomer();
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }
}
