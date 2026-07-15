package com.thdpv.movietheater.hr.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.hr.service.AttendanceService;

/**
 * Tự động đánh dấu VẮNG cho các ca đã qua mà nhân viên không check-in.
 */
@Component
public class HrAttendanceScheduler {

    private static final Logger log = LoggerFactory.getLogger(HrAttendanceScheduler.class);

    private final AttendanceService attendanceService;

    public HrAttendanceScheduler(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @Scheduled(cron = "${app.hr.absent-scan-cron:0 15 0 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void markAbsentees() {
        try {
            int created = attendanceService.markAbsentForPastAssignments();
            if (created > 0) {
                log.info("HR absent-scan: đánh dấu vắng {} ca chưa check-in", created);
            }
        } catch (Exception e) {
            log.warn("HR absent-scan thất bại: {}", e.getMessage());
        }
    }
}
