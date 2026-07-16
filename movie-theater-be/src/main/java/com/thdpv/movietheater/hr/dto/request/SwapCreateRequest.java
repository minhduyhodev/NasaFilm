package com.thdpv.movietheater.hr.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * Đơn xin đổi ca: ca của tôi đổi lấy ca của đồng nghiệp.
 */
public record SwapCreateRequest(
        @NotNull UUID requesterAssignmentUuid,
        @NotNull UUID counterpartAssignmentUuid,
        String note) {
}
