package com.thdpv.movietheater.hr.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.LeaveType;
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
 * Đơn xin nghỉ phép của nhân viên (theo khoảng ngày, bao gồm 2 đầu mút).
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_leave_request",
        indexes = {
                @Index(name = "idx_hr_leave_user", columnList = "user_uuid"),
                @Index(name = "idx_hr_leave_status", columnList = "status")
        })
public class LeaveRequest {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", nullable = false, length = 16)
    private LeaveType leaveType = LeaveType.ANNUAL;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

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
