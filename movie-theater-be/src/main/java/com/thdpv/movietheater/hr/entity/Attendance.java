package com.thdpv.movietheater.hr.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.ApprovalStatus;
import com.thdpv.movietheater.hr.enums.AttendanceStatus;
import com.thdpv.movietheater.hr.enums.DayType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Bản ghi chấm công theo ca: giờ vào/ra, số phút thường/OT và trạng thái duyệt.
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_attendance",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_hr_attendance_assignment",
                columnNames = { "shift_assignment_uuid" }),
        indexes = {
                @Index(name = "idx_hr_attendance_user_date", columnList = "user_uuid,work_date"),
                @Index(name = "idx_hr_attendance_approval", columnList = "approval_status,work_date")
        })
public class Attendance {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "shift_assignment_uuid")
    private UUID shiftAssignmentUuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "shift_definition_uuid", nullable = false)
    private UUID shiftDefinitionUuid;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "check_in_at")
    private OffsetDateTime checkInAt;

    @Column(name = "check_out_at")
    private OffsetDateTime checkOutAt;

    @Column(name = "worked_minutes", nullable = false)
    private int workedMinutes = 0;

    @Column(name = "regular_minutes", nullable = false)
    private int regularMinutes = 0;

    @Column(name = "ot_minutes", nullable = false)
    private int otMinutes = 0;

    @Column(name = "ot_minutes_approved", nullable = false)
    private int otMinutesApproved = 0;

    /** true khi admin đã chỉnh số phút OT duyệt bằng tay (kể cả về 0) -> không tự động duyệt full khi Duyệt. */
    @Column(name = "ot_approval_manual", nullable = false, columnDefinition = "boolean default false")
    private boolean otApprovalManual = false;

    @Column(name = "late_minutes", nullable = false)
    private int lateMinutes = 0;

    @Column(name = "early_leave_minutes", nullable = false)
    private int earlyLeaveMinutes = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", nullable = false, length = 24)
    private AttendanceStatus attendanceStatus = AttendanceStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_type", nullable = false, length = 16)
    private DayType dayType = DayType.WEEKDAY;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 16)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
