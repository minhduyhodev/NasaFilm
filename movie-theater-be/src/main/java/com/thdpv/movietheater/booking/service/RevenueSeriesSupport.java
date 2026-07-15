package com.thdpv.movietheater.booking.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds a single reporting period (day / week / month) selected by an {@code offset} back from now,
 * together with the sub-buckets that make up its detail chart:
 * <ul>
 *   <li>MONTH → one bucket per day of the month</li>
 *   <li>WEEK → one bucket per day (Mon..Sun)</li>
 *   <li>DAY → one bucket per hour (00:00..23:00)</li>
 * </ul>
 *
 * <p>All bucketing is done in Vietnam local time so periods align with the local calendar the admin
 * UI shows. The matching SQL truncates with
 * {@code date_trunc(subKeyword, created_at at time zone 'Asia/Ho_Chi_Minh')} and filters the row by
 * {@code created_at >= from and created_at < to}.
 */
final class RevenueSeriesSupport {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DAY_MONTH_YEAR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DAY_KEY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter HOUR_KEY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH");
    private static final DateTimeFormatter HOUR_LABEL = DateTimeFormatter.ofPattern("HH:00");

    enum Granularity {
        DAY, WEEK, MONTH;

        static Granularity parse(String raw) {
            if (raw == null) {
                return DAY;
            }
            return switch (raw.trim().toLowerCase()) {
                case "week", "weekly", "tuan" -> WEEK;
                case "month", "monthly", "thang" -> MONTH;
                default -> DAY;
            };
        }

        String apiValue() {
            return name().toLowerCase();
        }
    }

    /** One point on the detail chart. {@code key} matches the normalized date_trunc text from SQL. */
    static final class SeriesBucket {
        final String key;
        final String label;

        SeriesBucket(String key, String label) {
            this.key = key;
            this.label = label;
        }
    }

    /** A selected reporting period plus its sub-buckets. */
    static final class Period {
        final Granularity granularity;
        final OffsetDateTime from;
        final OffsetDateTime to;
        final String subTruncKeyword;
        final int keyLength;
        final String periodLabel;
        final boolean hasNext;
        final int offset;
        final List<SeriesBucket> buckets;

        Period(Granularity granularity, OffsetDateTime from, OffsetDateTime to, String subTruncKeyword,
                int keyLength, String periodLabel, boolean hasNext, int offset, List<SeriesBucket> buckets) {
            this.granularity = granularity;
            this.from = from;
            this.to = to;
            this.subTruncKeyword = subTruncKeyword;
            this.keyLength = keyLength;
            this.periodLabel = periodLabel;
            this.hasNext = hasNext;
            this.offset = offset;
            this.buckets = buckets;
        }
    }

    /**
     * @param offset how many whole periods back from the current one (0 = current, 1 = previous, ...).
     */
    static Period buildPeriod(Granularity granularity, int offset) {
        int off = Math.max(0, offset);
        LocalDate today = LocalDate.now(ZONE);
        List<SeriesBucket> buckets = new ArrayList<>();

        switch (granularity) {
            case MONTH -> {
                LocalDate first = today.withDayOfMonth(1).minusMonths(off);
                LocalDate nextFirst = first.plusMonths(1);
                for (LocalDate d = first; d.isBefore(nextFirst); d = d.plusDays(1)) {
                    buckets.add(new SeriesBucket(d.format(DAY_KEY), d.format(DAY_MONTH)));
                }
                String label = "Tháng " + first.getMonthValue() + "/" + first.getYear();
                return new Period(granularity, atStart(first), atStart(nextFirst), "day", 10, label,
                        off > 0, off, buckets);
            }
            case WEEK -> {
                LocalDate monday = today.with(DayOfWeek.MONDAY).minusWeeks(off);
                LocalDate nextMonday = monday.plusWeeks(1);
                for (LocalDate d = monday; d.isBefore(nextMonday); d = d.plusDays(1)) {
                    buckets.add(new SeriesBucket(d.format(DAY_KEY), d.format(DAY_MONTH)));
                }
                String label = monday.format(DAY_MONTH) + " – " + monday.plusDays(6).format(DAY_MONTH_YEAR);
                return new Period(granularity, atStart(monday), atStart(nextMonday), "day", 10, label,
                        off > 0, off, buckets);
            }
            default -> {
                LocalDate day = today.minusDays(off);
                LocalDateTime dayStart = day.atStartOfDay();
                for (int h = 0; h < 24; h++) {
                    LocalDateTime slot = dayStart.plusHours(h);
                    buckets.add(new SeriesBucket(slot.format(HOUR_KEY), slot.format(HOUR_LABEL)));
                }
                String label = day.format(DAY_MONTH_YEAR);
                return new Period(granularity, atStart(day), atStart(day.plusDays(1)), "hour", 13, label,
                        off > 0, off, buckets);
            }
        }
    }

    /**
     * Resolves the effective offset: when {@code date} is a valid yyyy-MM-dd it wins (jump straight to
     * the period containing that date via the calendar picker), otherwise the raw {@code offset} is used.
     * Both are clamped to {@code >= 0} so a future selection just lands on the current period.
     */
    static int resolveOffset(Granularity granularity, int offset, String date) {
        if (date != null && !date.isBlank()) {
            try {
                return Math.max(0, offsetForDate(granularity, LocalDate.parse(date.trim())));
            } catch (RuntimeException ignored) {
                // malformed date — fall back to the numeric offset
            }
        }
        return Math.max(0, offset);
    }

    /** Whole periods between the anchor date's period and the current one (positive = in the past). */
    static int offsetForDate(Granularity granularity, LocalDate anchor) {
        LocalDate today = LocalDate.now(ZONE);
        return switch (granularity) {
            case WEEK -> (int) ChronoUnit.WEEKS.between(
                    anchor.with(DayOfWeek.MONDAY), today.with(DayOfWeek.MONDAY));
            case MONTH -> (int) ChronoUnit.MONTHS.between(
                    anchor.withDayOfMonth(1), today.withDayOfMonth(1));
            default -> (int) ChronoUnit.DAYS.between(anchor, today);
        };
    }

    /** date_trunc text is like "2026-07-15 13:00:00"; take the leading key of the right width. */
    static String normalizeKey(String bucketText, int keyLength) {
        if (bucketText == null || bucketText.length() < keyLength) {
            return null;
        }
        return bucketText.substring(0, keyLength);
    }

    private static OffsetDateTime atStart(LocalDate date) {
        return date.atStartOfDay(ZONE).toOffsetDateTime();
    }

    private RevenueSeriesSupport() {
    }
}
