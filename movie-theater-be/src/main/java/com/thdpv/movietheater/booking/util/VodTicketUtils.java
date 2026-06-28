package com.thdpv.movietheater.booking.util;

import java.util.UUID;

public final class VodTicketUtils {

    private VodTicketUtils() {
    }

    public static String formatTicketCode(UUID bookingUuid) {
        if (bookingUuid == null) {
            return "";
        }
        String raw = bookingUuid.toString();
        String prefix = raw.length() >= 8 ? raw.substring(0, 8) : raw;
        return "VOD-" + prefix;
    }
}
