package com.thdpv.movietheater.cinema.dto.response;

import java.util.UUID;

public class SeatResponse {

    private UUID uuid;
    private String rowName;
    private Integer seatNumber;
    private String status;
    private UUID seatTypeUuid;
    private String seatTypeName;

    public SeatResponse() {
    }

    public SeatResponse(UUID uuid, String rowName, Integer seatNumber, String status, UUID seatTypeUuid, String seatTypeName) {
        this.uuid = uuid;
        this.rowName = rowName;
        this.seatNumber = seatNumber;
        this.status = status;
        this.seatTypeUuid = seatTypeUuid;
        this.seatTypeName = seatTypeName;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getRowName() {
        return rowName;
    }

    public void setRowName(String rowName) {
        this.rowName = rowName;
    }

    public Integer getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(Integer seatNumber) {
        this.seatNumber = seatNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getSeatTypeUuid() {
        return seatTypeUuid;
    }

    public void setSeatTypeUuid(UUID seatTypeUuid) {
        this.seatTypeUuid = seatTypeUuid;
    }

    public String getSeatTypeName() {
        return seatTypeName;
    }

    public void setSeatTypeName(String seatTypeName) {
        this.seatTypeName = seatTypeName;
    }
}
