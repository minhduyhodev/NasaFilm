package com.thdpv.movietheater.booking.dto.response;

import com.thdpv.movietheater.cinema.enums.SeatStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class SeatViewDto {

    private UUID showtimeUuid;
    private UUID cinemaRoomUuid;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private UUID seatUuid;
    private String rowName;
    private Integer seatNumber;
    private SeatStatus seatDbStatus;
    private UUID seatTypeUuid;
    private String seatTypeName;
    private BigDecimal basePrice;
    private BigDecimal priceModifier;
    private UUID bookingSeatUuid;
    private UUID lockedUserUuid;
    private OffsetDateTime lockedUntil;
    private OffsetDateTime checkedInAt;

    public SeatViewDto() {
    }

    public SeatViewDto(UUID showtimeUuid, UUID cinemaRoomUuid, OffsetDateTime startTime, OffsetDateTime endTime,
                       UUID seatUuid, String rowName, Integer seatNumber, SeatStatus seatDbStatus, UUID seatTypeUuid,
                       String seatTypeName, BigDecimal basePrice, BigDecimal priceModifier, UUID bookingSeatUuid,
                       UUID lockedUserUuid, OffsetDateTime lockedUntil) {
        this(showtimeUuid, cinemaRoomUuid, startTime, endTime, seatUuid, rowName, seatNumber, seatDbStatus,
                seatTypeUuid, seatTypeName, basePrice, priceModifier, bookingSeatUuid, lockedUserUuid, lockedUntil, null);
    }

    public SeatViewDto(UUID showtimeUuid, UUID cinemaRoomUuid, OffsetDateTime startTime, OffsetDateTime endTime,
                       UUID seatUuid, String rowName, Integer seatNumber, SeatStatus seatDbStatus, UUID seatTypeUuid,
                       String seatTypeName, BigDecimal basePrice, BigDecimal priceModifier, UUID bookingSeatUuid,
                       UUID lockedUserUuid, OffsetDateTime lockedUntil, OffsetDateTime checkedInAt) {
        this.showtimeUuid = showtimeUuid;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.startTime = startTime;
        this.endTime = endTime;
        this.seatUuid = seatUuid;
        this.rowName = rowName;
        this.seatNumber = seatNumber;
        this.seatDbStatus = seatDbStatus;
        this.seatTypeUuid = seatTypeUuid;
        this.seatTypeName = seatTypeName;
        this.basePrice = basePrice;
        this.priceModifier = priceModifier;
        this.bookingSeatUuid = bookingSeatUuid;
        this.lockedUserUuid = lockedUserUuid;
        this.lockedUntil = lockedUntil;
        this.checkedInAt = checkedInAt;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public UUID getCinemaRoomUuid() {
        return cinemaRoomUuid;
    }

    public void setCinemaRoomUuid(UUID cinemaRoomUuid) {
        this.cinemaRoomUuid = cinemaRoomUuid;
    }

    public OffsetDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(OffsetDateTime startTime) {
        this.startTime = startTime;
    }

    public OffsetDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(OffsetDateTime endTime) {
        this.endTime = endTime;
    }

    public UUID getSeatUuid() {
        return seatUuid;
    }

    public void setSeatUuid(UUID seatUuid) {
        this.seatUuid = seatUuid;
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

    public SeatStatus getSeatDbStatus() {
        return seatDbStatus;
    }

    public void setSeatDbStatus(SeatStatus seatDbStatus) {
        this.seatDbStatus = seatDbStatus;
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

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public BigDecimal getPriceModifier() {
        return priceModifier;
    }

    public void setPriceModifier(BigDecimal priceModifier) {
        this.priceModifier = priceModifier;
    }

    public UUID getBookingSeatUuid() {
        return bookingSeatUuid;
    }

    public void setBookingSeatUuid(UUID bookingSeatUuid) {
        this.bookingSeatUuid = bookingSeatUuid;
    }

    public UUID getLockedUserUuid() {
        return lockedUserUuid;
    }

    public void setLockedUserUuid(UUID lockedUserUuid) {
        this.lockedUserUuid = lockedUserUuid;
    }

    public OffsetDateTime getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(OffsetDateTime lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public OffsetDateTime getCheckedInAt() {
        return checkedInAt;
    }

    public void setCheckedInAt(OffsetDateTime checkedInAt) {
        this.checkedInAt = checkedInAt;
    }
}
