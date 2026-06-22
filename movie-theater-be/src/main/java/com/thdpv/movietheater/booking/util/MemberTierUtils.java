package com.thdpv.movietheater.booking.util;

public final class MemberTierUtils {

    public static final int TIER_FRIEND_MIN_SCORE = 5000;
    public static final int TIER_VIP_MIN_SCORE = 10000;

    private MemberTierUtils() {
    }

    public static String resolveTierCode(int lifetimeScore) {
        if (lifetimeScore >= TIER_VIP_MIN_SCORE) {
            return "VIP";
        }
        if (lifetimeScore >= TIER_FRIEND_MIN_SCORE) {
            return "FRIEND";
        }
        return "MEMBER";
    }

    public static String resolveTierLabel(int lifetimeScore) {
        if (lifetimeScore >= TIER_VIP_MIN_SCORE) {
            return "NASA VIP";
        }
        if (lifetimeScore >= TIER_FRIEND_MIN_SCORE) {
            return "NASA Friend";
        }
        return "NASA Member";
    }

    public static String resolveRequiredTierLabel(Integer minScore) {
        if (minScore == null || minScore <= 0) {
            return "Tất cả hạng";
        }
        if (minScore >= TIER_VIP_MIN_SCORE) {
            return "NASA VIP";
        }
        if (minScore >= TIER_FRIEND_MIN_SCORE) {
            return "NASA Friend";
        }
        return "NASA Member";
    }

    public static boolean meetsTierRequirement(int lifetimeScore, Integer minScore) {
        if (minScore == null || minScore <= 0) {
            return true;
        }
        return lifetimeScore >= minScore;
    }
}
