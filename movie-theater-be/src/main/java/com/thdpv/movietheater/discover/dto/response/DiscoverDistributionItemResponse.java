package com.thdpv.movietheater.discover.dto.response;

public class DiscoverDistributionItemResponse {

    private final String key;
    private final String label;
    private final long count;
    private final double percentage;

    public DiscoverDistributionItemResponse(String key, String label, long count, double percentage) {
        this.key = key;
        this.label = label;
        this.count = count;
        this.percentage = percentage;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public long getCount() {
        return count;
    }

    public double getPercentage() {
        return percentage;
    }
}
