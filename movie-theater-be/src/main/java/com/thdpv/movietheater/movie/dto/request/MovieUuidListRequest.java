package com.thdpv.movietheater.movie.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public class MovieUuidListRequest {

    @NotEmpty
    @Size(max = 50)
    private List<UUID> uuids;

    public MovieUuidListRequest() {
    }

    public MovieUuidListRequest(List<UUID> uuids) {
        this.uuids = uuids;
    }

    public List<UUID> getUuids() {
        return uuids;
    }

    public void setUuids(List<UUID> uuids) {
        this.uuids = uuids;
    }
}
