package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Time-series revenue over a rolling day/week/month window, with the totals for that window.
 * Points are gap-filled (buckets with no revenue are present with zero) so charts render evenly.
 */
public class RevenueSeriesResponse {

    private String granularity;
    /** Human-readable label of the selected period, e.g. "Tháng 7/2026" or "15/07/2026". */
    private String periodLabel;
    /** First local date of the selected period (yyyy-MM-dd), so the date picker can snap to it. */
    private String periodStartDate;
    /** How many whole periods back from the current one (0 = current). */
    private int offset;
    /** False when already at the current period (cannot navigate to a newer one). */
    private boolean canGoNext;
    private List<RevenueSeriesPoint> points;
    private BigDecimal totalRevenue;
    private long totalTransactions;

    public RevenueSeriesResponse() {
    }

    public RevenueSeriesResponse(String granularity, String periodLabel, String periodStartDate, int offset,
            boolean canGoNext, List<RevenueSeriesPoint> points, BigDecimal totalRevenue, long totalTransactions) {
        this.granularity = granularity;
        this.periodLabel = periodLabel;
        this.periodStartDate = periodStartDate;
        this.offset = offset;
        this.canGoNext = canGoNext;
        this.points = points;
        this.totalRevenue = totalRevenue;
        this.totalTransactions = totalTransactions;
    }

    public String getGranularity() {
        return granularity;
    }

    public void setGranularity(String granularity) {
        this.granularity = granularity;
    }

    public String getPeriodLabel() {
        return periodLabel;
    }

    public void setPeriodLabel(String periodLabel) {
        this.periodLabel = periodLabel;
    }

    public String getPeriodStartDate() {
        return periodStartDate;
    }

    public void setPeriodStartDate(String periodStartDate) {
        this.periodStartDate = periodStartDate;
    }

    public int getOffset() {
        return offset;
    }

    public void setOffset(int offset) {
        this.offset = offset;
    }

    public boolean isCanGoNext() {
        return canGoNext;
    }

    public void setCanGoNext(boolean canGoNext) {
        this.canGoNext = canGoNext;
    }

    public List<RevenueSeriesPoint> getPoints() {
        return points;
    }

    public void setPoints(List<RevenueSeriesPoint> points) {
        this.points = points;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(BigDecimal totalRevenue) {
        this.totalRevenue = totalRevenue;
    }

    public long getTotalTransactions() {
        return totalTransactions;
    }

    public void setTotalTransactions(long totalTransactions) {
        this.totalTransactions = totalTransactions;
    }

    public static class RevenueSeriesPoint {
        private String periodStart;
        private String label;
        private BigDecimal revenue;
        private long transactions;

        public RevenueSeriesPoint() {
        }

        public RevenueSeriesPoint(String periodStart, String label, BigDecimal revenue, long transactions) {
            this.periodStart = periodStart;
            this.label = label;
            this.revenue = revenue;
            this.transactions = transactions;
        }

        public String getPeriodStart() {
            return periodStart;
        }

        public void setPeriodStart(String periodStart) {
            this.periodStart = periodStart;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public BigDecimal getRevenue() {
            return revenue;
        }

        public void setRevenue(BigDecimal revenue) {
            this.revenue = revenue;
        }

        public long getTransactions() {
            return transactions;
        }

        public void setTransactions(long transactions) {
            this.transactions = transactions;
        }
    }
}
