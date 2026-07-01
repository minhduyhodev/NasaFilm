package com.thdpv.movietheater.preshow.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PreShowReminderRulesTest {

    @Test
    void shouldSendReminder_WhenWithinTargetAndShowNotStarted() {
        assertTrue(PreShowReminderRules.shouldSendReminder(60, 60));
        assertTrue(PreShowReminderRules.shouldSendReminder(45, 60));
        assertTrue(PreShowReminderRules.shouldSendReminder(0, 15));
    }

    @Test
    void shouldSendReminder_CatchesUpAfterMissedSchedulerWindow() {
        assertTrue(PreShowReminderRules.shouldSendReminder(55, 60));
        assertTrue(PreShowReminderRules.shouldSendReminder(10, 15));
    }

    @Test
    void shouldSendReminder_WhenTooEarlyOrAlreadyStarted() {
        assertFalse(PreShowReminderRules.shouldSendReminder(61, 60));
        assertFalse(PreShowReminderRules.shouldSendReminder(-1, 60));
    }
}
