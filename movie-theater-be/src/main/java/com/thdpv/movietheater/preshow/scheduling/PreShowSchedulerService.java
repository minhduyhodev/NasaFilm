package com.thdpv.movietheater.preshow.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.thdpv.movietheater.preshow.service.PreShowReminderService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PreShowSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(PreShowSchedulerService.class);

    private final PreShowReminderService preShowReminderService;

    @Scheduled(cron = "${app.scheduler.pre-show-cron:0 * * * * ?}")
    public void dispatchPreShowRemindersScheduled() {
        try {
            preShowReminderService.dispatchDueReminders();
        } catch (Exception ex) {
            log.error("Failed to dispatch pre-show reminders", ex);
        }
    }
}
