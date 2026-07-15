package com.thdpv.movietheater.hr.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record EmployeeProfileRequest(
        @NotNull(message = "Vui lòng nhập đơn giá theo giờ")
        @DecimalMin(value = "0.0", message = "Đơn giá theo giờ không được âm")
        @DecimalMax(value = "100000000", message = "Đơn giá theo giờ quá lớn") BigDecimal hourlyRate,
        @DecimalMin(value = "1.0", message = "Hệ số OT phải ≥ 1")
        @DecimalMax(value = "5.0", message = "Hệ số OT tối đa là 5") BigDecimal otMultiplierWeekday,
        @DecimalMin(value = "1.0", message = "Hệ số OT phải ≥ 1")
        @DecimalMax(value = "5.0", message = "Hệ số OT tối đa là 5") BigDecimal otMultiplierWeekend,
        @DecimalMin(value = "1.0", message = "Hệ số OT phải ≥ 1")
        @DecimalMax(value = "5.0", message = "Hệ số OT tối đa là 5") BigDecimal otMultiplierHoliday,
        String employmentType,
        Boolean active,
        String note) {
}
