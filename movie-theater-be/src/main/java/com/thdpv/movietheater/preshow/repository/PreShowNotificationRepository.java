package com.thdpv.movietheater.preshow.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.preshow.entity.PreShowNotification;

public interface PreShowNotificationRepository extends JpaRepository<PreShowNotification, UUID> {
    boolean existsByBookingUuidAndNotificationType(UUID bookingUuid, String notificationType);

    Optional<PreShowNotification> findByBookingUuidAndNotificationType(UUID bookingUuid, String notificationType);
}
