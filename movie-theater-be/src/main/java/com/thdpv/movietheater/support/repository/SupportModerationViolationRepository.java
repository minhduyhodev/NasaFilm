package com.thdpv.movietheater.support.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportModerationViolation;

public interface SupportModerationViolationRepository
        extends JpaRepository<SupportModerationViolation, UUID> {

    List<SupportModerationViolation> findByUserEmailIgnoreCaseAndCreatedAtAfter(
            String userEmail,
            OffsetDateTime createdAfter);

    Optional<SupportModerationViolation>
            findFirstByUserEmailIgnoreCaseAndBlockedUntilAfterOrderByBlockedUntilDesc(
                    String userEmail,
                    OffsetDateTime now);
}
