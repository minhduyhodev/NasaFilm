package com.thdpv.movietheater.hr.dto.response;

import java.util.List;

/**
 * Danh mục quyền dùng cho kiểm tra phủ quyền theo ca.
 * {@code required} là bộ quyền vận hành mặc định; {@code all} là toàn bộ quyền để cấu hình theo từng ca.
 */
public record ShiftPermissionCatalogResponse(List<PermissionInfo> required, List<PermissionInfo> all) {

    public record PermissionInfo(String name, String label, String group) {
    }
}
