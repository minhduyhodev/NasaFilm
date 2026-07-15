package com.thdpv.movietheater.hr.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.time.AppTimeZones;
import com.thdpv.movietheater.hr.dto.response.AttendanceResponse;
import com.thdpv.movietheater.hr.dto.response.MyHrOverviewResponse;
import com.thdpv.movietheater.hr.dto.response.PayslipResponse;
import com.thdpv.movietheater.hr.dto.response.ShiftAssignmentResponse;

/**
 * Tổng hợp dữ liệu tự phục vụ cho nhân viên (dashboard cá nhân).
 */
@Service
public class HrSelfService {

    /** Cho phép check-in sớm nhất trước giờ ca (khớp AttendanceService). */
    private static final long CHECK_IN_EARLY_WINDOW_MINUTES = 60;
    /** Cho phép check-in trễ nhất sau giờ tan ca (khớp AttendanceService). */
    private static final long CHECK_IN_LATE_WINDOW_MINUTES = 30;

    private final ShiftAssignmentService shiftAssignmentService;
    private final AttendanceService attendanceService;
    private final PayrollService payrollService;

    public HrSelfService(ShiftAssignmentService shiftAssignmentService,
            AttendanceService attendanceService,
            PayrollService payrollService) {
        this.shiftAssignmentService = shiftAssignmentService;
        this.attendanceService = attendanceService;
        this.payrollService = payrollService;
    }

    @Transactional(readOnly = true)
    public MyHrOverviewResponse overview(UUID userId) {
        LocalDate today = AppTimeZones.now().toLocalDate();
        YearMonth month = YearMonth.from(today);

        List<ShiftAssignmentResponse> upcoming = shiftAssignmentService.list(today, today.plusDays(7), userId);
        List<ShiftAssignmentResponse> todayShifts = shiftAssignmentService.list(today, today, userId);
        ShiftAssignmentResponse activeShift = resolveActiveShift(todayShifts, AppTimeZones.now().toLocalDateTime());

        List<AttendanceResponse> monthAttendance = attendanceService.listForUser(
                userId, month.atDay(1), month.atEndOfMonth());
        int monthRegular = 0;
        int monthOt = 0;
        int approvedCount = 0;
        int pendingCount = 0;
        for (AttendanceResponse a : monthAttendance) {
            if ("APPROVED".equals(a.approvalStatus())) {
                monthRegular += a.regularMinutes();
                monthOt += a.otMinutesApproved();
                approvedCount++;
            } else if ("PENDING".equals(a.approvalStatus())) {
                pendingCount++;
            }
        }

        List<PayslipResponse> payslips = payrollService.listMyPayslips(userId);
        PayslipResponse latest = payslips.isEmpty() ? null : payslips.get(0);

        return new MyHrOverviewResponse(
                upcoming.size(),
                monthAttendance.size(),
                monthRegular,
                monthOt,
                approvedCount,
                pendingCount,
                latest != null ? latest.netPay() : BigDecimal.ZERO,
                latest != null ? latest.periodLabel() : null,
                activeShift);
    }

    /**
     * Ca "đang diễn ra" cho dashboard nhân viên:
     * 1) Ưu tiên ca đã check-in nhưng chưa check-out (cần check-out) — bất kể giờ.
     * 2) Nếu không có, chọn ca chưa chấm công mà hiện tại đang trong cửa sổ check-in.
     * Ca đã kết thúc / đã hoàn tất / ngoài cửa sổ sẽ không hiển thị.
     */
    private ShiftAssignmentResponse resolveActiveShift(List<ShiftAssignmentResponse> todayShifts, LocalDateTime now) {
        ShiftAssignmentResponse inProgress = todayShifts.stream()
                .filter(s -> s.checkInAt() != null && s.checkOutAt() == null)
                .min(Comparator.comparing(ShiftAssignmentResponse::checkInAt))
                .orElse(null);
        if (inProgress != null) {
            return inProgress;
        }
        return todayShifts.stream()
                .filter(s -> s.attendanceStatus() == null && s.checkInAt() == null)
                .filter(s -> s.startTime() != null && s.endTime() != null)
                .filter(s -> isCheckInWindowOpen(now, s))
                .min(Comparator.comparing(ShiftAssignmentResponse::startTime))
                .orElse(null);
    }

    private boolean isCheckInWindowOpen(LocalDateTime now, ShiftAssignmentResponse s) {
        LocalDateTime start = s.workDate().atTime(s.startTime());
        LocalDateTime end = s.endTime().isAfter(s.startTime())
                ? s.workDate().atTime(s.endTime())
                : s.workDate().plusDays(1).atTime(s.endTime());
        return !now.isBefore(start.minusMinutes(CHECK_IN_EARLY_WINDOW_MINUTES))
                && !now.isAfter(end.plusMinutes(CHECK_IN_LATE_WINDOW_MINUTES));
    }
}
