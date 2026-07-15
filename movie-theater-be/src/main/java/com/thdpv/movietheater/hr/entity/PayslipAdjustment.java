package com.thdpv.movietheater.hr.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.AdjustmentType;

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
 * Khoản điều chỉnh lương (thưởng / khấu trừ) gắn với nhân viên trong một kỳ lương.
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_payslip_adjustment",
        indexes = {
                @Index(name = "idx_hr_adjustment_period_user", columnList = "payroll_period_uuid,user_uuid")
        })
public class PayslipAdjustment {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "payroll_period_uuid", nullable = false)
    private UUID payrollPeriodUuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false, length = 16)
    private AdjustmentType adjustmentType;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by")
    private UUID createdBy;
}
