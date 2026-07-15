package com.thdpv.movietheater.hr.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Hồ sơ lương của nhân viên: đơn giá theo giờ và các hệ số OT.
 */
@Getter
@Setter
@Entity
@Table(name = "hr_employee_profile")
public class EmployeeProfile {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "user_uuid", nullable = false, unique = true)
    private UUID userUuid;

    @Column(name = "hourly_rate", nullable = false, precision = 15, scale = 2)
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    @Column(name = "ot_multiplier_weekday", nullable = false, precision = 5, scale = 2)
    private BigDecimal otMultiplierWeekday = new BigDecimal("1.50");

    @Column(name = "ot_multiplier_weekend", nullable = false, precision = 5, scale = 2)
    private BigDecimal otMultiplierWeekend = new BigDecimal("2.00");

    @Column(name = "ot_multiplier_holiday", nullable = false, precision = 5, scale = 2)
    private BigDecimal otMultiplierHoliday = new BigDecimal("2.00");

    @Column(name = "employment_type", length = 32)
    private String employmentType = "PART_TIME";

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;
}
