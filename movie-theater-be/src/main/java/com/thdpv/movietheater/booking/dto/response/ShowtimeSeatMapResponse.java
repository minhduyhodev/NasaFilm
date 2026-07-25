package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ShowtimeSeatMapResponse {

    private UUID showtimeUuid;
    private UUID cinemaRoomUuid;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private Integer lockTtlSeconds;
    private OffsetDateTime serverTime;
    private List<RowItem> rows = new ArrayList<>();
    private String layoutConfig;

    public ShowtimeSeatMapResponse() {
    }

    public ShowtimeSeatMapResponse(UUID showtimeUuid, UUID cinemaRoomUuid, OffsetDateTime startTime,
            OffsetDateTime endTime, Integer lockTtlSeconds, List<RowItem> rows) {
        this.showtimeUuid = showtimeUuid;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.startTime = startTime;
        this.endTime = endTime;
        this.lockTtlSeconds = lockTtlSeconds;
        this.rows = rows != null ? rows : new ArrayList<>();
    }

    public ShowtimeSeatMapResponse(UUID showtimeUuid, UUID cinemaRoomUuid, OffsetDateTime startTime,
            OffsetDateTime endTime, Integer lockTtlSeconds, OffsetDateTime serverTime, List<RowItem> rows,
            String layoutConfig) {
        this.showtimeUuid = showtimeUuid;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.startTime = startTime;
        this.endTime = endTime;
        this.lockTtlSeconds = lockTtlSeconds;
        this.serverTime = serverTime;
        this.rows = rows != null ? rows : new ArrayList<>();
        this.layoutConfig = layoutConfig;
    }

    public ShowtimeSeatMapResponse(UUID showtimeUuid, UUID cinemaRoomUuid, OffsetDateTime startTime,
            OffsetDateTime endTime, Integer lockTtlSeconds, OffsetDateTime serverTime, List<RowItem> rows) {
        this(showtimeUuid, cinemaRoomUuid, startTime, endTime, lockTtlSeconds, serverTime, rows, null);
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

    public Integer getLockTtlSeconds() {
        return lockTtlSeconds;
    }

    public void setLockTtlSeconds(Integer lockTtlSeconds) {
        this.lockTtlSeconds = lockTtlSeconds;
    }

    public OffsetDateTime getServerTime() {
        return serverTime;
    }

    public void setServerTime(OffsetDateTime serverTime) {
        this.serverTime = serverTime;
    }

    public List<RowItem> getRows() {
        return rows;
    }

    public void setRows(List<RowItem> rows) {
        this.rows = rows;
    }

    public String getLayoutConfig() {
        return layoutConfig;
    }

    public void setLayoutConfig(String layoutConfig) {
        this.layoutConfig = layoutConfig;
    }

    public static class RowItem {
        private String rowName;
        private List<SeatItem> seats = new ArrayList<>();

        public RowItem() {
        }

        public RowItem(String rowName, List<SeatItem> seats) {
            this.rowName = rowName;
            this.seats = seats != null ? seats : new ArrayList<>();
        }

        public String getRowName() {
            return rowName;
        }

        public void setRowName(String rowName) {
            this.rowName = rowName;
        }

        public List<SeatItem> getSeats() {
            return seats;
        }

        public void setSeats(List<SeatItem> seats) {
            this.seats = seats;
        }
    }

    public static class SeatItem {
        private UUID seatUuid;
        private Integer seatNumber;
        private String seatDbStatus;
        private UUID seatTypeUuid;
        private String seatTypeName;
        private BigDecimal price;
        private String availabilityStatus;
        private Boolean selected;
        private Boolean blocked;
        private OffsetDateTime lockedUntil;
        private Boolean checkedIn;

        public SeatItem() {
        }

        public SeatItem(UUID seatUuid, Integer seatNumber, String seatDbStatus, UUID seatTypeUuid,
                String seatTypeName, BigDecimal price, String availabilityStatus, Boolean selected, Boolean blocked,
                OffsetDateTime lockedUntil) {
            this(seatUuid, seatNumber, seatDbStatus, seatTypeUuid, seatTypeName, price, availabilityStatus,
                    selected, blocked, lockedUntil, false);
        }

        public SeatItem(UUID seatUuid, Integer seatNumber, String seatDbStatus, UUID seatTypeUuid,
                String seatTypeName, BigDecimal price, String availabilityStatus, Boolean selected, Boolean blocked,
                OffsetDateTime lockedUntil, Boolean checkedIn) {
            this.seatUuid = seatUuid;
            this.seatNumber = seatNumber;
            this.seatDbStatus = seatDbStatus;
            this.seatTypeUuid = seatTypeUuid;
            this.seatTypeName = seatTypeName;
            this.price = price;
            this.availabilityStatus = availabilityStatus;
            this.selected = selected;
            this.blocked = blocked;
            this.lockedUntil = lockedUntil;
            this.checkedIn = checkedIn;
        }

        public UUID getSeatUuid() {
            return seatUuid;
        }

        public void setSeatUuid(UUID seatUuid) {
            this.seatUuid = seatUuid;
        }

        public Integer getSeatNumber() {
            return seatNumber;
        }

        public void setSeatNumber(Integer seatNumber) {
            this.seatNumber = seatNumber;
        }

        public String getSeatDbStatus() {
            return seatDbStatus;
        }

        public void setSeatDbStatus(String seatDbStatus) {
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

        public BigDecimal getPrice() {
            return price;
        }

        public void setPrice(BigDecimal price) {
            this.price = price;
        }

        public String getAvailabilityStatus() {
            return availabilityStatus;
        }

        public void setAvailabilityStatus(String availabilityStatus) {
            this.availabilityStatus = availabilityStatus;
        }

        public Boolean getSelected() {
            return selected;
        }

        public void setSelected(Boolean selected) {
            this.selected = selected;
        }

        public Boolean getBlocked() {
            return blocked;
        }

        public void setBlocked(Boolean blocked) {
            this.blocked = blocked;
        }

        public OffsetDateTime getLockedUntil() {
            return lockedUntil;
        }

        public void setLockedUntil(OffsetDateTime lockedUntil) {
            this.lockedUntil = lockedUntil;
        }

        public Boolean getCheckedIn() {
            return checkedIn;
        }

        public void setCheckedIn(Boolean checkedIn) {
            this.checkedIn = checkedIn;
        }
    }
}
