package com.thdpv.movietheater.booking.dto.response;

import java.util.UUID;

public class CustomerBookingHistoryResponse {
    private UUID bookingUuid;
    private String id; // ticket code
    private String movieTitle;
    private String cinema;
    private String showtime;
    private String seats;
    private String combo;
    private String price;
    private String status;
    private UUID movieUuid;
    private String moviePosterUrl;
    private String bookingType;
    private boolean cancellable;
    private boolean vodActivated;
    private String bookingStatus;

    public CustomerBookingHistoryResponse() {
    }

    public CustomerBookingHistoryResponse(UUID bookingUuid, String id, String movieTitle, String cinema, String showtime, String seats, String combo, String price, String status, UUID movieUuid, String bookingType, boolean cancellable, boolean vodActivated, String bookingStatus) {
        this.bookingUuid = bookingUuid;
        this.id = id;
        this.movieTitle = movieTitle;
        this.cinema = cinema;
        this.showtime = showtime;
        this.seats = seats;
        this.combo = combo;
        this.price = price;
        this.status = status;
        this.movieUuid = movieUuid;
        this.bookingType = bookingType;
        this.cancellable = cancellable;
        this.vodActivated = vodActivated;
        this.bookingStatus = bookingStatus;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getCinema() {
        return cinema;
    }

    public void setCinema(String cinema) {
        this.cinema = cinema;
    }

    public String getShowtime() {
        return showtime;
    }

    public void setShowtime(String showtime) {
        this.showtime = showtime;
    }

    public String getSeats() {
        return seats;
    }

    public void setSeats(String seats) {
        this.seats = seats;
    }

    public String getCombo() {
        return combo;
    }

    public void setCombo(String combo) {
        this.combo = combo;
    }

    public String getPrice() {
        return price;
    }

    public void setPrice(String price) {
        this.price = price;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public String getMoviePosterUrl() {
        return moviePosterUrl;
    }

    public void setMoviePosterUrl(String moviePosterUrl) {
        this.moviePosterUrl = moviePosterUrl;
    }

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public boolean isCancellable() {
        return cancellable;
    }

    public void setCancellable(boolean cancellable) {
        this.cancellable = cancellable;
    }

    public boolean isVodActivated() {
        return vodActivated;
    }

    public void setVodActivated(boolean vodActivated) {
        this.vodActivated = vodActivated;
    }

    public String getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(String bookingStatus) {
        this.bookingStatus = bookingStatus;
    }
}
