package com.thdpv.movietheater.booking.service.scheduling;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import com.thdpv.movietheater.booking.dto.request.AutoShowtimeRequest;

public final class ShowtimeSchedulingSettings {

    private final LocalTime startTime;
    private final LocalTime endTime;
    private final int intervalMinutes;
    private final int trailerBuffer;
    /** Minimum minutes from now before a new showtime may start. */
    private final int minLeadMinutes;
    private final int slotStepMinutes;
    private final int gridAlignMinutes;
    private final double fairnessPenalty;
    private final int sameMovieGapMinutes;
    private final double defaultRating;
    private final int defaultDurationMinutes;
    private final double weekendScore;
    private final double weekdayScore;
    private final boolean includeFridayAsWeekend;
    private final LocalTime goldenHourPeakStart;
    private final LocalTime goldenHourPeakEnd;
    private final double goldenHourPeakScore;
    private final LocalTime goldenHourNearStart1;
    private final LocalTime goldenHourNearEnd1;
    private final LocalTime goldenHourNearStart2;
    private final LocalTime goldenHourNearEnd2;
    private final double goldenHourNearScore;
    private final double genreTierHot;
    private final double genreTierMid;
    private final double genreTierBase;
    private final List<String> genreHotKeywords;
    private final List<String> genreMidKeywords;
    private final double goldenHourWeight;
    private final double weekendWeight;
    private final double ratingWeight;
    private final double genreWeight;
    private final BigDecimal basePrice;
    private final BigDecimal vipPrice;
    private final BigDecimal couplePrice;

    private ShowtimeSchedulingSettings(Builder builder) {
        this.startTime = builder.startTime;
        this.endTime = builder.endTime;
        this.intervalMinutes = builder.intervalMinutes;
        this.trailerBuffer = builder.trailerBuffer;
        this.minLeadMinutes = builder.minLeadMinutes;
        this.slotStepMinutes = builder.slotStepMinutes;
        this.gridAlignMinutes = builder.gridAlignMinutes;
        this.fairnessPenalty = builder.fairnessPenalty;
        this.sameMovieGapMinutes = builder.sameMovieGapMinutes;
        this.defaultRating = builder.defaultRating;
        this.defaultDurationMinutes = builder.defaultDurationMinutes;
        this.weekendScore = builder.weekendScore;
        this.weekdayScore = builder.weekdayScore;
        this.includeFridayAsWeekend = builder.includeFridayAsWeekend;
        this.goldenHourPeakStart = builder.goldenHourPeakStart;
        this.goldenHourPeakEnd = builder.goldenHourPeakEnd;
        this.goldenHourPeakScore = builder.goldenHourPeakScore;
        this.goldenHourNearStart1 = builder.goldenHourNearStart1;
        this.goldenHourNearEnd1 = builder.goldenHourNearEnd1;
        this.goldenHourNearStart2 = builder.goldenHourNearStart2;
        this.goldenHourNearEnd2 = builder.goldenHourNearEnd2;
        this.goldenHourNearScore = builder.goldenHourNearScore;
        this.genreTierHot = builder.genreTierHot;
        this.genreTierMid = builder.genreTierMid;
        this.genreTierBase = builder.genreTierBase;
        this.genreHotKeywords = builder.genreHotKeywords;
        this.genreMidKeywords = builder.genreMidKeywords;
        this.goldenHourWeight = builder.goldenHourWeight;
        this.weekendWeight = builder.weekendWeight;
        this.ratingWeight = builder.ratingWeight;
        this.genreWeight = builder.genreWeight;
        this.basePrice = builder.basePrice;
        this.vipPrice = builder.vipPrice;
        this.couplePrice = builder.couplePrice;
    }

    public static ShowtimeSchedulingSettings fromConfig(Map<String, Object> config) {
        return builderFromConfig(config).build();
    }

    public static ShowtimeSchedulingSettings merge(Map<String, Object> config, AutoShowtimeRequest request) {
        Builder builder = builderFromConfig(config);
        if (request.getStartTime() != null) {
            builder.startTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            builder.endTime(request.getEndTime());
        }
        if (request.getIntervalMinutes() != null) {
            builder.intervalMinutes(request.getIntervalMinutes());
        }
        if (request.getTrailerBuffer() != null) {
            builder.trailerBuffer(request.getTrailerBuffer());
        }
        if (request.getGoldenHourWeight() != null) {
            builder.goldenHourWeight(request.getGoldenHourWeight());
        }
        if (request.getWeekendWeight() != null) {
            builder.weekendWeight(request.getWeekendWeight());
        }
        if (request.getRatingWeight() != null) {
            builder.ratingWeight(request.getRatingWeight());
        }
        if (request.getGenreWeight() != null) {
            builder.genreWeight(request.getGenreWeight());
        }
        if (request.getBasePrice() != null) {
            builder.basePrice(request.getBasePrice());
        }
        if (request.getVipPrice() != null) {
            builder.vipPrice(request.getVipPrice());
        }
        if (request.getCouplePrice() != null) {
            builder.couplePrice(request.getCouplePrice());
        }
        return builder.build();
    }

    private static Builder builderFromConfig(Map<String, Object> config) {
        return new Builder()
                .startTime(parseTime(config.get("startTime"), LocalTime.of(8, 0)))
                .endTime(parseTime(config.get("endTime"), LocalTime.of(23, 30)))
                .intervalMinutes(readInt(config.get("intervalMinutes"), 15, 0, 120))
                .trailerBuffer(readInt(config.get("trailerBuffer"), 10, 0, 60))
                .minLeadMinutes(readInt(config.get("minLeadMinutes"), 30, 0, 180))
                .slotStepMinutes(readInt(config.get("slotStepMinutes"), 30, 15, 120))
                .gridAlignMinutes(readInt(config.get("gridAlignMinutes"), 15, 5, 60))
                .fairnessPenalty(readDouble(config.get("fairnessPenalty"), 25.0, 0, 100))
                .sameMovieGapMinutes(readInt(config.get("sameMovieGapMinutes"), 30, 0, 180))
                .defaultRating(readDouble(config.get("defaultRating"), 8.0, 0, 10))
                .defaultDurationMinutes(readInt(config.get("defaultDurationMinutes"), 120, 60, 300))
                .weekendScore(readDouble(config.get("weekendScore"), 10.0, 0, 20))
                .weekdayScore(readDouble(config.get("weekdayScore"), 0.0, 0, 20))
                .includeFridayAsWeekend(readBoolean(config.get("includeFridayAsWeekend"), true))
                .goldenHourPeakStart(parseTime(config.get("goldenHourPeakStart"), LocalTime.of(18, 0)))
                .goldenHourPeakEnd(parseTime(config.get("goldenHourPeakEnd"), LocalTime.of(22, 30)))
                .goldenHourPeakScore(readDouble(config.get("goldenHourPeakScore"), 15.0, 0, 30))
                .goldenHourNearStart1(parseTime(config.get("goldenHourNearStart1"), LocalTime.of(12, 0)))
                .goldenHourNearEnd1(parseTime(config.get("goldenHourNearEnd1"), LocalTime.of(18, 0)))
                .goldenHourNearStart2(parseTime(config.get("goldenHourNearStart2"), LocalTime.of(22, 30)))
                .goldenHourNearEnd2(parseTime(config.get("goldenHourNearEnd2"), LocalTime.of(23, 59)))
                .goldenHourNearScore(readDouble(config.get("goldenHourNearScore"), 8.0, 0, 20))
                .genreTierHot(readDouble(config.get("genreTierHot"), 10.0, 0, 20))
                .genreTierMid(readDouble(config.get("genreTierMid"), 7.0, 0, 20))
                .genreTierBase(readDouble(config.get("genreTierBase"), 4.0, 0, 20))
                .genreHotKeywords(readStringList(config.get("genreHotKeywords"),
                        List.of("hành động", "viễn tưởng", "hoạt hình")))
                .genreMidKeywords(readStringList(config.get("genreMidKeywords"),
                        List.of("phiêu lưu", "kịch tính", "tình cảm")))
                .goldenHourWeight(readDouble(config.get("goldenHourWeight"), 1.2, 0.1, 5))
                .weekendWeight(readDouble(config.get("weekendWeight"), 1.5, 0.1, 5))
                .ratingWeight(readDouble(config.get("ratingWeight"), 1.0, 0.1, 5))
                .genreWeight(readDouble(config.get("genreWeight"), 1.1, 0.1, 5))
                .basePrice(readBigDecimal(config.get("basePrice"), BigDecimal.valueOf(60000)))
                .vipPrice(readBigDecimal(config.get("vipPrice"), BigDecimal.valueOf(90000)))
                .couplePrice(readBigDecimal(config.get("couplePrice"), BigDecimal.valueOf(120000)));
    }

    private static LocalTime parseTime(Object value, LocalTime fallback) {
        if (value instanceof String text && !text.isBlank()) {
            try {
                return LocalTime.parse(text.trim());
            } catch (Exception ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private static int readInt(Object value, int fallback, int min, int max) {
        int parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.intValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private static double readDouble(Object value, double fallback, double min, double max) {
        double parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.doubleValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private static boolean readBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String text && !text.isBlank()) {
            return Boolean.parseBoolean(text.trim());
        }
        return fallback;
    }

    private static List<String> readStringList(Object value, List<String> fallback) {
        if (!(value instanceof List<?> raw) || raw.isEmpty()) {
            return fallback;
        }
        List<String> result = raw.stream()
                .filter(String.class::isInstance)
                .map(item -> ((String) item).trim().toLowerCase())
                .filter(s -> !s.isEmpty())
                .toList();
        return result.isEmpty() ? fallback : result;
    }

    private static BigDecimal readBigDecimal(Object value, BigDecimal fallback) {
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.longValue());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public int getIntervalMinutes() { return intervalMinutes; }
    public int getTrailerBuffer() { return trailerBuffer; }
    public int getMinLeadMinutes() { return minLeadMinutes; }
    public int getSlotStepMinutes() { return slotStepMinutes; }
    public int getGridAlignMinutes() { return gridAlignMinutes; }
    public double getFairnessPenalty() { return fairnessPenalty; }
    public int getSameMovieGapMinutes() { return sameMovieGapMinutes; }
    public double getDefaultRating() { return defaultRating; }
    public int getDefaultDurationMinutes() { return defaultDurationMinutes; }
    public double getWeekendScore() { return weekendScore; }
    public double getWeekdayScore() { return weekdayScore; }
    public boolean isIncludeFridayAsWeekend() { return includeFridayAsWeekend; }
    public LocalTime getGoldenHourPeakStart() { return goldenHourPeakStart; }
    public LocalTime getGoldenHourPeakEnd() { return goldenHourPeakEnd; }
    public double getGoldenHourPeakScore() { return goldenHourPeakScore; }
    public LocalTime getGoldenHourNearStart1() { return goldenHourNearStart1; }
    public LocalTime getGoldenHourNearEnd1() { return goldenHourNearEnd1; }
    public LocalTime getGoldenHourNearStart2() { return goldenHourNearStart2; }
    public LocalTime getGoldenHourNearEnd2() { return goldenHourNearEnd2; }
    public double getGoldenHourNearScore() { return goldenHourNearScore; }
    public double getGenreTierHot() { return genreTierHot; }
    public double getGenreTierMid() { return genreTierMid; }
    public double getGenreTierBase() { return genreTierBase; }
    public List<String> getGenreHotKeywords() { return genreHotKeywords; }
    public List<String> getGenreMidKeywords() { return genreMidKeywords; }
    public double getGoldenHourWeight() { return goldenHourWeight; }
    public double getWeekendWeight() { return weekendWeight; }
    public double getRatingWeight() { return ratingWeight; }
    public double getGenreWeight() { return genreWeight; }
    public BigDecimal getBasePrice() { return basePrice; }
    public BigDecimal getVipPrice() { return vipPrice; }
    public BigDecimal getCouplePrice() { return couplePrice; }

    private static final class Builder {
        private LocalTime startTime = LocalTime.of(8, 0);
        private LocalTime endTime = LocalTime.of(23, 30);
        private int intervalMinutes = 15;
        private int trailerBuffer = 10;
        private int minLeadMinutes = 30;
        private int slotStepMinutes = 30;
        private int gridAlignMinutes = 15;
        private double fairnessPenalty = 25.0;
        private int sameMovieGapMinutes = 30;
        private double defaultRating = 8.0;
        private int defaultDurationMinutes = 120;
        private double weekendScore = 10.0;
        private double weekdayScore = 0.0;
        private boolean includeFridayAsWeekend = true;
        private LocalTime goldenHourPeakStart = LocalTime.of(18, 0);
        private LocalTime goldenHourPeakEnd = LocalTime.of(22, 30);
        private double goldenHourPeakScore = 15.0;
        private LocalTime goldenHourNearStart1 = LocalTime.of(12, 0);
        private LocalTime goldenHourNearEnd1 = LocalTime.of(18, 0);
        private LocalTime goldenHourNearStart2 = LocalTime.of(22, 30);
        private LocalTime goldenHourNearEnd2 = LocalTime.of(23, 59);
        private double goldenHourNearScore = 8.0;
        private double genreTierHot = 10.0;
        private double genreTierMid = 7.0;
        private double genreTierBase = 4.0;
        private List<String> genreHotKeywords = List.of("hành động", "viễn tưởng", "hoạt hình");
        private List<String> genreMidKeywords = List.of("phiêu lưu", "kịch tính", "tình cảm");
        private double goldenHourWeight = 1.2;
        private double weekendWeight = 1.5;
        private double ratingWeight = 1.0;
        private double genreWeight = 1.1;
        private BigDecimal basePrice = BigDecimal.valueOf(60000);
        private BigDecimal vipPrice = BigDecimal.valueOf(90000);
        private BigDecimal couplePrice = BigDecimal.valueOf(120000);

        Builder startTime(LocalTime v) { startTime = v; return this; }
        Builder endTime(LocalTime v) { endTime = v; return this; }
        Builder intervalMinutes(int v) { intervalMinutes = v; return this; }
        Builder trailerBuffer(int v) { trailerBuffer = v; return this; }
        Builder minLeadMinutes(int v) { minLeadMinutes = v; return this; }
        Builder slotStepMinutes(int v) { slotStepMinutes = v; return this; }
        Builder gridAlignMinutes(int v) { gridAlignMinutes = v; return this; }
        Builder fairnessPenalty(double v) { fairnessPenalty = v; return this; }
        Builder sameMovieGapMinutes(int v) { sameMovieGapMinutes = v; return this; }
        Builder defaultRating(double v) { defaultRating = v; return this; }
        Builder defaultDurationMinutes(int v) { defaultDurationMinutes = v; return this; }
        Builder weekendScore(double v) { weekendScore = v; return this; }
        Builder weekdayScore(double v) { weekdayScore = v; return this; }
        Builder includeFridayAsWeekend(boolean v) { includeFridayAsWeekend = v; return this; }
        Builder goldenHourPeakStart(LocalTime v) { goldenHourPeakStart = v; return this; }
        Builder goldenHourPeakEnd(LocalTime v) { goldenHourPeakEnd = v; return this; }
        Builder goldenHourPeakScore(double v) { goldenHourPeakScore = v; return this; }
        Builder goldenHourNearStart1(LocalTime v) { goldenHourNearStart1 = v; return this; }
        Builder goldenHourNearEnd1(LocalTime v) { goldenHourNearEnd1 = v; return this; }
        Builder goldenHourNearStart2(LocalTime v) { goldenHourNearStart2 = v; return this; }
        Builder goldenHourNearEnd2(LocalTime v) { goldenHourNearEnd2 = v; return this; }
        Builder goldenHourNearScore(double v) { goldenHourNearScore = v; return this; }
        Builder genreTierHot(double v) { genreTierHot = v; return this; }
        Builder genreTierMid(double v) { genreTierMid = v; return this; }
        Builder genreTierBase(double v) { genreTierBase = v; return this; }
        Builder genreHotKeywords(List<String> v) { genreHotKeywords = v; return this; }
        Builder genreMidKeywords(List<String> v) { genreMidKeywords = v; return this; }
        Builder goldenHourWeight(double v) { goldenHourWeight = v; return this; }
        Builder weekendWeight(double v) { weekendWeight = v; return this; }
        Builder ratingWeight(double v) { ratingWeight = v; return this; }
        Builder genreWeight(double v) { genreWeight = v; return this; }
        Builder basePrice(BigDecimal v) { basePrice = v; return this; }
        Builder vipPrice(BigDecimal v) { vipPrice = v; return this; }
        Builder couplePrice(BigDecimal v) { couplePrice = v; return this; }

        ShowtimeSchedulingSettings build() {
            return new ShowtimeSchedulingSettings(this);
        }
    }
}
