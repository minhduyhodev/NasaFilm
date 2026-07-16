package com.thdpv.movietheater.cinema.dto.request;

import java.util.List;

public class GenerateSeatMapRequest {

    private Integer rowCount;
    private Integer seatsPerRow;

    /**
     * 1-based column indices (within the generated grid, i.e. seatNumber) that represent
     * walking aisles rather than sellable seats. These positions are created with
     * status=DISABLED so they never count towards the room's bookable capacity.
     */
    private List<Integer> aisleCols;

    public GenerateSeatMapRequest() {
    }

    public GenerateSeatMapRequest(Integer rowCount, Integer seatsPerRow) {
        this.rowCount = rowCount;
        this.seatsPerRow = seatsPerRow;
    }

    public Integer getRowCount() {
        return rowCount;
    }

    public void setRowCount(Integer rowCount) {
        this.rowCount = rowCount;
    }

    public Integer getSeatsPerRow() {
        return seatsPerRow;
    }

    public void setSeatsPerRow(Integer seatsPerRow) {
        this.seatsPerRow = seatsPerRow;
    }

    public List<Integer> getAisleCols() {
        return aisleCols;
    }

    public void setAisleCols(List<Integer> aisleCols) {
        this.aisleCols = aisleCols;
    }
}
