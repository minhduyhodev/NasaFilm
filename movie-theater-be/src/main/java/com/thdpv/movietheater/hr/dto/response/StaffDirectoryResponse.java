package com.thdpv.movietheater.hr.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Mục nhân viên rút gọn dùng cho bộ chọn khi xếp ca / duyệt công.
 * Kèm trạng thái hồ sơ lương và các quyền hiệu lực để kiểm tra phủ quyền theo ca.
 */
public record StaffDirectoryResponse(
        UUID userId,
        String fullName,
        String email,
        String avatarUrl,
        boolean hasSalaryProfile,
        List<String> permissions) {
}
