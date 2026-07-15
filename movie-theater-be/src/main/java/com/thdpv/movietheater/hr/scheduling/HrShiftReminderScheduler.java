package com.thdpv.movietheater.hr.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.hr.service.ShiftAssignmentService;

/**
 * Gửi nhắc "ca sắp tới" cho nhân viên trước giờ vào ca.
 */
@Component
public class HrShiftReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(HrShiftReminderScheduler.class);

    private final ShiftAssignmentService shiftAssignmentService;

    public HrShiftReminderScheduler(ShiftAssignmentService shiftAssignmentService) {
        this.shiftAssignmentService = shiftAssignmentService;
    }

    @Scheduled(cron = "${app.hr.shift-reminder-cron:0 */15 * * * *}", zone = "Asia/Ho_Chi_Minh")
    public void remindUpcomingShifts() {
        try {
            int sent = shiftAssignmentService.sendUpcomingShiftReminders();
            if (sent > 0) {
                log.info("HR shift-reminder: đã nhắc {} ca sắp tới", sent);
            }
        } catch (Exception e) {
            log.warn("HR shift-reminder thất bại: {}", e.getMessage());
        }
    }
}
