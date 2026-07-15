package com.thdpv.movietheater.hr.dto.request;

import java.util.List;

/**
 * Cấu hình bộ quyền vận hành yêu cầu cho một ca. Danh sách rỗng = dùng bộ mặc định.
 */
public record ShiftRequiredPermissionsRequest(List<String> permissions) {
}
