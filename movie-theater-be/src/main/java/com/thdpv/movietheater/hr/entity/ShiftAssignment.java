package com.thdpv.movietheater.hr.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.ShiftAssignmentStatus;

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
 * Phân ca đã xếp cho nhân viên trong một ngày cụ thể.
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_shift_assignment",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_hr_shift_assignment",
                columnNames = { "user_uuid", "work_date", "shift_definition_uuid" }),
        indexes = {
                @Index(name = "idx_hr_shift_assignment_user_date", columnList = "user_uuid,work_date"),
                @Index(name = "idx_hr_shift_assignment_date", columnList = "work_date")
        })
public class ShiftAssignment {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "shift_definition_uuid", nullable = false)
    private UUID shiftDefinitionUuid;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private ShiftAssignmentStatus status = ShiftAssignmentStatus.SCHEDULED;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;
}
