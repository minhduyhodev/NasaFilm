package com.thdpv.movietheater.preshow.util;

public final class PreShowReminderRules {

    private PreShowReminderRules() {
    }

    /**
     * Sends when the show is within {@code targetMinutes} and has not started yet.
     * Missed scheduler windows are caught up on the next run.
     */
    public static boolean shouldSendReminder(long minutesUntil, int targetMinutes) {
        return minutesUntil <= targetMinutes && minutesUntil >= 0;
    }
}
