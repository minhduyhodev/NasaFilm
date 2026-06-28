package com.thdpv.movietheater.booking.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public class VodStatusBatchRequest {

    @NotEmpty
    @Size(max = 50)
    private List<UUID> movieUuids;

    public VodStatusBatchRequest() {
    }

    public VodStatusBatchRequest(List<UUID> movieUuids) {
        this.movieUuids = movieUuids;
    }

    public List<UUID> getMovieUuids() {
        return movieUuids;
    }

    public void setMovieUuids(List<UUID> movieUuids) {
        this.movieUuids = movieUuids;
    }
}
