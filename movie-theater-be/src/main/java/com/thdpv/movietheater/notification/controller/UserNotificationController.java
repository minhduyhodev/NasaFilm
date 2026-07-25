package com.thdpv.movietheater.notification.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.notification.dto.CreateUserNotificationRequest;
import com.thdpv.movietheater.notification.dto.PushSubscriptionRequest;
import com.thdpv.movietheater.notification.dto.UserNotificationResponse;
import com.thdpv.movietheater.notification.service.UserNotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class UserNotificationController {

    private final UserNotificationService userNotificationService;

    public UserNotificationController(UserNotificationService userNotificationService) {
        this.userNotificationService = userNotificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserNotificationResponse>>> list(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                userNotificationService.listNotifications(userDetails.getUsername())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserNotificationResponse>> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateUserNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(
                userNotificationService.createNotification(userDetails.getUsername(), request)));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal UserDetails userDetails) {
        userNotificationService.markAllRead(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã đánh dấu tất cả đã đọc"));
    }

    @PostMapping("/push/subscribe")
    public ResponseEntity<ApiResponse<Void>> subscribePush(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PushSubscriptionRequest request) {
        userNotificationService.savePushSubscription(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã đăng ký Web Push"));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        userNotificationService.deleteAllNotifications(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa tất cả thông báo"));
    }
}
