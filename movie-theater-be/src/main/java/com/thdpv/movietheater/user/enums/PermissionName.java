package com.thdpv.movietheater.user.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

public enum PermissionName {
    TICKET_CHECKIN("Soát vé", "Gate"),
    COUNTER_BOOKING_CREATE("Bán vé tại quầy", "Counter"),
    COUNTER_COMBO_CREATE("Bán combo tại quầy", "Counter"),
    COUNTER_VOUCHER_APPLY("Áp voucher tại quầy", "Counter"),
    COUNTER_REFUND_PROCESS("Hoàn tiền tại quầy", "Counter"),
    COUNTER_CUSTOMER_CREATE("Tạo tài khoản nhanh", "Counter"),
    MOVIE_WRITE("Thêm/sửa/xóa phim", "Content"),
    SHOWTIME_WRITE("Quản lý suất chiếu", "Content"),
    COMBO_WRITE("Quản lý combo", "Content"),
    PROMOTION_WRITE("Quản lý khuyến mãi", "Content"),
    USER_VIEW("Xem danh sách user", "Admin ops"),
    SUPPORT_MANAGE("Quản lý support ticket", "Admin ops"),
    HR_SHIFT_MANAGE("Xếp ca làm việc", "Chấm công & Lương"),
    HR_ATTENDANCE_MANAGE("Quản lý & duyệt chấm công", "Chấm công & Lương"),
    HR_PAYROLL_MANAGE("Quản lý lương, thưởng, OT", "Chấm công & Lương");

    private final String description;
    private final String group;

    PermissionName(String description, String group) {
        this.description = description;
        this.group = group;
    }

    public String getDescription() {
        return description;
    }

    public String getGroup() {
        return group;
    }

    /** Các nhóm quyền phục vụ khách trực tiếp tại rạp -> cần được bao phủ trong mỗi ca làm việc. */
    private static final Set<String> SHIFT_OPERATIONAL_GROUPS = Set.of("Gate", "Counter");

    public boolean isShiftOperational() {
        return SHIFT_OPERATIONAL_GROUPS.contains(group);
    }

    /**
     * Bộ quyền "vận hành ca": tổng hợp quyền của các nhân viên trong cùng một ca
     * nên bao phủ đủ bộ này để rạp/website hoạt động mượt (soát vé, bán vé, combo, voucher, hoàn tiền...).
     */
    public static List<PermissionName> shiftOperationalRequired() {
        return Arrays.stream(values()).filter(PermissionName::isShiftOperational).toList();
    }

    public static Set<PermissionName> presetPermissions(String preset) {
        if (preset == null || preset.isBlank()) {
            return Set.of();
        }
        return switch (preset.trim().toUpperCase()) {
            case "COUNTER" -> Set.of(
                    COUNTER_BOOKING_CREATE,
                    COUNTER_COMBO_CREATE,
                    COUNTER_VOUCHER_APPLY,
                    COUNTER_CUSTOMER_CREATE);
            case "GATE" -> Set.of(TICKET_CHECKIN);
            case "CONTENT" -> Set.of(MOVIE_WRITE, SHOWTIME_WRITE, COMBO_WRITE, PROMOTION_WRITE);
            case "GENERAL", "FULL" -> Set.copyOf(List.of(values()));
            default -> Set.of();
        };
    }
}
