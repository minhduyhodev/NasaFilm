package com.thdpv.movietheater.hr.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Ngày lễ do admin quản lý; dùng để áp hệ số OT ngày lễ.
 */
@Getter
@Setter
@Entity
@Table(name = "hr_holiday")
public class Holiday {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    /** Nếu có, ghi đè hệ số OT ngày lễ trong hồ sơ nhân viên. */
    @Column(name = "multiplier_override", precision = 5, scale = 2)
    private BigDecimal multiplierOverride;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by")
    private UUID createdBy;
}
