package com.thdpv.movietheater.hr.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.RequestStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Đơn xin đổi ca: hoán đổi chủ sở hữu giữa ca của người yêu cầu và ca của đồng nghiệp.
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_shift_swap_request",
        indexes = {
                @Index(name = "idx_hr_swap_requester", columnList = "requester_uuid"),
                @Index(name = "idx_hr_swap_counterpart", columnList = "counterpart_uuid"),
                @Index(name = "idx_hr_swap_status", columnList = "status")
        })
public class ShiftSwapRequest {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "requester_uuid", nullable = false)
    private UUID requesterUuid;

    @Column(name = "requester_assignment_uuid", nullable = false)
    private UUID requesterAssignmentUuid;

    @Column(name = "counterpart_uuid", nullable = false)
    private UUID counterpartUuid;

    @Column(name = "counterpart_assignment_uuid", nullable = false)
    private UUID counterpartAssignmentUuid;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "review_note", columnDefinition = "text")
    private String reviewNote;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
