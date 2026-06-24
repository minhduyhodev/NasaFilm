package com.thdpv.movietheater.booking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.CancellationRequest;

public interface CancellationRequestRepository extends JpaRepository<CancellationRequest, UUID> {
    Optional<CancellationRequest> findFirstByBookingUuidOrderByCreatedAtDesc(UUID bookingUuid);

    List<CancellationRequest> findByStatusOrderByCreatedAtDesc(String status);
}
