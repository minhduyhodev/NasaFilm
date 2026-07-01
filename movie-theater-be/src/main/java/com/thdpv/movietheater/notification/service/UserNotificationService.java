package com.thdpv.movietheater.notification.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.notification.dto.CreateUserNotificationRequest;
import com.thdpv.movietheater.notification.dto.PushSubscriptionRequest;
import com.thdpv.movietheater.notification.dto.UserNotificationResponse;
import com.thdpv.movietheater.notification.entity.PushSubscription;
import com.thdpv.movietheater.notification.repository.PushSubscriptionRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserNotification;
import com.thdpv.movietheater.user.repository.UserNotificationRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class UserNotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;

    public UserNotificationService(
            UserNotificationRepository userNotificationRepository,
            PushSubscriptionRepository pushSubscriptionRepository,
            UserRepository userRepository) {
        this.userNotificationRepository = userNotificationRepository;
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserNotificationResponse> listNotifications(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        return userNotificationRepository.findTop50ByUserUuidOrderByCreatedAtDesc(userUuid).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserNotificationResponse createNotification(String userEmail, CreateUserNotificationRequest request) {
        UUID userUuid = resolveUserUuid(userEmail);
        UserNotification notification = new UserNotification();
        notification.setUuid(UUID.randomUUID());
        notification.setUserUuid(userUuid);
        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setActionUrl(request.getActionUrl());
        notification.setType(request.getType() != null ? request.getType() : "info");
        notification.setCreatedAt(OffsetDateTime.now());
        return toResponse(userNotificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        userNotificationRepository.markAllRead(userUuid);
    }

    @Transactional
    public void savePushSubscription(String userEmail, PushSubscriptionRequest request) {
        UUID userUuid = resolveUserUuid(userEmail);
        PushSubscription subscription = pushSubscriptionRepository.findByEndpoint(request.getEndpoint())
                .orElseGet(PushSubscription::new);
        if (subscription.getUuid() == null) {
            subscription.setUuid(UUID.randomUUID());
            subscription.setCreatedAt(OffsetDateTime.now());
        }
        subscription.setUserUuid(userUuid);
        subscription.setEndpoint(request.getEndpoint());
        subscription.setP256dh(request.getP256dh());
        subscription.setAuth(request.getAuth());
        pushSubscriptionRepository.save(subscription);
    }

    @Transactional
    public void createSystemNotification(UUID userUuid, String title, String content, String type) {
        createSystemNotification(userUuid, title, content, type, null);
    }

    @Transactional
    public void createSystemNotification(
            UUID userUuid, String title, String content, String type, String actionUrl) {
        UserNotification notification = new UserNotification();
        notification.setUuid(UUID.randomUUID());
        notification.setUserUuid(userUuid);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setActionUrl(actionUrl);
        notification.setType(type != null ? type : "info");
        notification.setCreatedAt(OffsetDateTime.now());
        userNotificationRepository.save(notification);
    }

    private UserNotificationResponse toResponse(UserNotification notification) {
        UserNotificationResponse response = new UserNotificationResponse();
        response.setUuid(notification.getUuid());
        response.setTitle(notification.getTitle());
        response.setContent(notification.getContent());
        response.setActionUrl(notification.getActionUrl());
        response.setType(notification.getType());
        response.setRead(notification.getReadAt() != null);
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }

    private UUID resolveUserUuid(String userEmail) {
        return userRepository.findByEmailIgnoreCase(userEmail)
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Người dùng chưa đăng nhập"));
    }
}
