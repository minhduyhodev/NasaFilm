package com.thdpv.movietheater.hr.dto.request;

import java.time.LocalDate;

import com.thdpv.movietheater.hr.enums.LeaveType;

import jakarta.validation.constraints.NotNull;

/**
 * Đơn xin nghỉ phép (nhân viên tạo).
 */
public record LeaveRequestCreateRequest(
        @NotNull LeaveType leaveType,
        @NotNull LocalDate fromDate,
        @NotNull LocalDate toDate,
        String reason) {
}
