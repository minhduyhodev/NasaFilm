package com.thdpv.movietheater.hr.entity;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Danh mục ca làm việc cố định (Sáng / Chiều / Tối).
 */
@Getter
@Setter
@Entity
@Table(name = "hr_shift_definition")
public class ShiftDefinition {

    @Id
    @Column(name = "uuid", nullable = false, updatable = false)
    private UUID uuid;

    @Column(name = "code", nullable = false, length = 32, unique = true)
    private String code;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "standard_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal standardHours;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    /**
     * Bộ quyền vận hành yêu cầu cho ca này (tên PermissionName, phân tách bằng dấu phẩy).
     * Null/rỗng = dùng bộ mặc định {@code PermissionName.shiftOperationalRequired()}.
     */
    @Column(name = "required_permissions", columnDefinition = "text")
    private String requiredPermissions;

    /** Số nhân viên tối thiểu cần xếp cho ca này mỗi ngày. 0 = không kiểm tra. */
    @Column(name = "min_staff", nullable = false, columnDefinition = "integer default 1")
    private int minStaff = 1;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
