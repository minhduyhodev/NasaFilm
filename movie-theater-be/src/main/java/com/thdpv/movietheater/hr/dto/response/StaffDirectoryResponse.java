package com.thdpv.movietheater.hr.dto.response;

import java.util.UUID;

/**
 * Mục nhân viên rút gọn dùng cho bộ chọn khi xếp ca / duyệt công.
 */
public record StaffDirectoryResponse(
        UUID userId,
        String fullName,
        String email,
        String avatarUrl) {
}
