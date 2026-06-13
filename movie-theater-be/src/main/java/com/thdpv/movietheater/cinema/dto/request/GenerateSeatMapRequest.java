package com.thdpv.movietheater.cinema.dto.request;

public class GenerateSeatMapRequest {

    private Integer rowCount;
    private Integer seatsPerRow;

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
}
