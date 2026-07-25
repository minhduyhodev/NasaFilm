package com.thdpv.movietheater.hr.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Yêu cầu check-in / check-out của nhân viên cho một phân ca.
 *
 * @param shiftAssignmentUuid phân ca cần chấm công
 * @param verificationCode    mã điểm danh (quét QR / nhập tay) để xác thực có mặt tại quầy
 */
public record ShiftActionRequest(
        @NotNull UUID shiftAssignmentUuid,
        @NotBlank(message = "Vui lòng quét mã QR hoặc nhập mã điểm danh") String verificationCode) {
}
