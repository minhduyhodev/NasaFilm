package com.thdpv.movietheater.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ShowtimeRequest {

    @NotNull(message = "Movie UUID is required")
    private UUID movieUuid;

    @NotNull(message = "Cinema Room UUID is required")
    private UUID cinemaRoomUuid;

    @NotNull(message = "Start time is required")
    private OffsetDateTime startTime;

    @NotNull(message = "Base price is required")
    @Positive(message = "Base price must be positive")
    private BigDecimal basePrice;

    private BigDecimal vipPrice;

    private BigDecimal couplePrice;

    public ShowtimeRequest() {
    }

    public ShowtimeRequest(UUID movieUuid, UUID cinemaRoomUuid, OffsetDateTime startTime, BigDecimal basePrice) {
        this.movieUuid = movieUuid;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.startTime = startTime;
        this.basePrice = basePrice;
    }

    public ShowtimeRequest(UUID movieUuid, UUID cinemaRoomUuid, OffsetDateTime startTime, BigDecimal basePrice, BigDecimal vipPrice, BigDecimal couplePrice) {
        this.movieUuid = movieUuid;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.startTime = startTime;
        this.basePrice = basePrice;
        this.vipPrice = vipPrice;
        this.couplePrice = couplePrice;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
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

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public BigDecimal getVipPrice() {
        return vipPrice;
    }

    public void setVipPrice(BigDecimal vipPrice) {
        this.vipPrice = vipPrice;
    }

    public BigDecimal getCouplePrice() {
        return couplePrice;
    }

    public void setCouplePrice(BigDecimal couplePrice) {
        this.couplePrice = couplePrice;
    }
}
