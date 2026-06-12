package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class BookingResponse {

    private UUID bookingUuid;
    private UUID showtimeUuid;
    private String status;
    private BigDecimal totalPrice;
    private Integer scoreAdded;
    private OffsetDateTime confirmedAt;
    private List<SeatLine> seats = new ArrayList<>();
    private List<ComboLine> combos = new ArrayList<>();
    private List<TicketLine> tickets = new ArrayList<>();

    public BookingResponse() {
    }

    public BookingResponse(UUID bookingUuid, UUID showtimeUuid, String status, BigDecimal totalPrice,
            Integer scoreAdded, OffsetDateTime confirmedAt, List<SeatLine> seats, List<ComboLine> combos,
            List<TicketLine> tickets) {
        this.bookingUuid = bookingUuid;
        this.showtimeUuid = showtimeUuid;
        this.status = status;
        this.totalPrice = totalPrice;
        this.scoreAdded = scoreAdded;
        this.confirmedAt = confirmedAt;
        this.seats = seats != null ? seats : new ArrayList<>();
        this.combos = combos != null ? combos : new ArrayList<>();
        this.tickets = tickets != null ? tickets : new ArrayList<>();
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public Integer getScoreAdded() {
        return scoreAdded;
    }

    public void setScoreAdded(Integer scoreAdded) {
        this.scoreAdded = scoreAdded;
    }

    public OffsetDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(OffsetDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public List<SeatLine> getSeats() {
        return seats;
    }

    public void setSeats(List<SeatLine> seats) {
        this.seats = seats;
    }

    public List<ComboLine> getCombos() {
        return combos;
    }

    public void setCombos(List<ComboLine> combos) {
        this.combos = combos;
    }

    public List<TicketLine> getTickets() {
        return tickets;
    }

    public void setTickets(List<TicketLine> tickets) {
        this.tickets = tickets;
    }

    public static class SeatLine {
        private UUID seatUuid;
        private String rowName;
        private Integer seatNumber;
        private BigDecimal price;

        public SeatLine(UUID seatUuid, String rowName, Integer seatNumber, BigDecimal price) {
            this.seatUuid = seatUuid;
            this.rowName = rowName;
            this.seatNumber = seatNumber;
            this.price = price;
        }

        public UUID getSeatUuid() {
            return seatUuid;
        }

        public String getRowName() {
            return rowName;
        }

        public Integer getSeatNumber() {
            return seatNumber;
        }

        public BigDecimal getPrice() {
            return price;
        }
    }

    public static class ComboLine {
        private UUID comboUuid;
        private String name;
        private Integer quantity;
        private BigDecimal price;

        public ComboLine(UUID comboUuid, String name, Integer quantity, BigDecimal price) {
            this.comboUuid = comboUuid;
            this.name = name;
            this.quantity = quantity;
            this.price = price;
        }

        public UUID getComboUuid() {
            return comboUuid;
        }

        public String getName() {
            return name;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public BigDecimal getPrice() {
            return price;
        }
    }

    public static class TicketLine {
        private UUID ticketUuid;
        private UUID bookingSeatUuid;
        private String ticketCode;
        private String qrCode;

        public TicketLine(UUID ticketUuid, UUID bookingSeatUuid, String ticketCode, String qrCode) {
            this.ticketUuid = ticketUuid;
            this.bookingSeatUuid = bookingSeatUuid;
            this.ticketCode = ticketCode;
            this.qrCode = qrCode;
        }

        public UUID getTicketUuid() {
            return ticketUuid;
        }

        public UUID getBookingSeatUuid() {
            return bookingSeatUuid;
        }

        public String getTicketCode() {
            return ticketCode;
        }

        public String getQrCode() {
            return qrCode;
        }
    }
}
