package com.thdpv.movietheater.hr.dto.request;

import java.util.List;

/**
 * Cấu hình một ca làm việc: bộ quyền vận hành yêu cầu + số nhân viên tối thiểu.
 * permissions rỗng = dùng bộ mặc định; minStaff null = giữ nguyên.
 */
public record ShiftConfigRequest(List<String> permissions, Integer minStaff) {
}
