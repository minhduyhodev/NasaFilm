package com.thdpv.movietheater.hr.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.thdpv.movietheater.hr.enums.PayslipStatus;

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
 * Phiếu lương của một nhân viên trong một kỳ lương.
 */
@Getter
@Setter
@Entity
@Table(
        name = "hr_payslip",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_hr_payslip_period_user",
                columnNames = { "payroll_period_uuid", "user_uuid" }),
        indexes = {
                @Index(name = "idx_hr_payslip_user", columnList = "user_uuid"),
                @Index(name = "idx_hr_payslip_period", columnList = "payroll_period_uuid")
        })
public class Payslip {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "payroll_period_uuid", nullable = false)
    private UUID payrollPeriodUuid;

    @Column(name = "user_uuid", nullable = false)
    private UUID userUuid;

    @Column(name = "regular_minutes", nullable = false)
    private int regularMinutes = 0;

    @Column(name = "ot_minutes", nullable = false)
    private int otMinutes = 0;

    @Column(name = "hourly_rate", nullable = false, precision = 15, scale = 2)
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    @Column(name = "regular_pay", nullable = false, precision = 15, scale = 2)
    private BigDecimal regularPay = BigDecimal.ZERO;

    @Column(name = "ot_pay", nullable = false, precision = 15, scale = 2)
    private BigDecimal otPay = BigDecimal.ZERO;

    @Column(name = "bonus_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal bonusTotal = BigDecimal.ZERO;

    @Column(name = "deduction_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal deductionTotal = BigDecimal.ZERO;

    @Column(name = "gross_pay", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossPay = BigDecimal.ZERO;

    @Column(name = "net_pay", nullable = false, precision = 15, scale = 2)
    private BigDecimal netPay = BigDecimal.ZERO;

    /** true khi nhân viên chưa có hồ sơ lương hợp lệ (chưa cấu hình / tạm ngưng / đơn giá 0) -> cần rà soát. */
    @Column(name = "salary_config_missing", nullable = false, columnDefinition = "boolean default false")
    private boolean salaryConfigMissing = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private PayslipStatus status = PayslipStatus.DRAFT;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;
}
