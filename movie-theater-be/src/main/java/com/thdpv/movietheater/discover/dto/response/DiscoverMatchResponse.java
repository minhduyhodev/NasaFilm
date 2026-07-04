package com.thdpv.movietheater.discover.dto.response;

import java.util.List;
import java.util.UUID;

public class DiscoverMatchResponse {

    private String flightCode;
    private String flightLabel;
    private List<DiscoverMatchItemResponse> matches;
    private int totalCandidates;
    private UUID sessionUuid;

    public String getFlightCode() {
        return flightCode;
    }

    public void setFlightCode(String flightCode) {
        this.flightCode = flightCode;
    }

    public String getFlightLabel() {
        return flightLabel;
    }

    public void setFlightLabel(String flightLabel) {
        this.flightLabel = flightLabel;
    }

    public List<DiscoverMatchItemResponse> getMatches() {
        return matches;
    }

    public void setMatches(List<DiscoverMatchItemResponse> matches) {
        this.matches = matches;
    }

    public int getTotalCandidates() {
        return totalCandidates;
    }

    public void setTotalCandidates(int totalCandidates) {
        this.totalCandidates = totalCandidates;
    }

    public UUID getSessionUuid() {
        return sessionUuid;
    }

    public void setSessionUuid(UUID sessionUuid) {
        this.sessionUuid = sessionUuid;
    }
}
