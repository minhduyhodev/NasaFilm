package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class AdminBookingListResponse {
    private UUID bookingUuid;
    private String customerName;
    private String customerEmail;
    private String movieTitle;
    private String cinemaRoomName;
    private String seats;
    private String combos;
    private BigDecimal totalPrice;
    private String status;
    private OffsetDateTime createdAt;

    public AdminBookingListResponse() {
    }

    public AdminBookingListResponse(UUID bookingUuid, String customerName, String customerEmail, String movieTitle,
            String cinemaRoomName, String seats, String combos, BigDecimal totalPrice, String status, OffsetDateTime createdAt) {
        this.bookingUuid = bookingUuid;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.movieTitle = movieTitle;
        this.cinemaRoomName = cinemaRoomName;
        this.seats = seats;
        this.combos = combos;
        this.totalPrice = totalPrice;
        this.status = status;
        this.createdAt = createdAt;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getCinemaRoomName() {
        return cinemaRoomName;
    }

    public void setCinemaRoomName(String cinemaRoomName) {
        this.cinemaRoomName = cinemaRoomName;
    }

    public String getSeats() {
        return seats;
    }

    public void setSeats(String seats) {
        this.seats = seats;
    }

    public String getCombos() {
        return combos;
    }

    public void setCombos(String combos) {
        this.combos = combos;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
