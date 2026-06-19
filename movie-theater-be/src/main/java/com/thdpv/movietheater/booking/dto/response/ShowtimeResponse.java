package com.thdpv.movietheater.booking.dto.response;

import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ShowtimeResponse {

    private UUID uuid;
    private UUID movieUuid;
    private String movieTitle;
    private UUID cinemaRoomUuid;
    private String cinemaRoomName;
    private String cinemaName;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private BigDecimal basePrice;
    private BigDecimal vipPrice;
    private BigDecimal couplePrice;
    private ShowtimeStatus status;

    private String moviePosterUrl;

    public ShowtimeResponse() {
    }

    public ShowtimeResponse(UUID uuid, UUID movieUuid, String movieTitle, UUID cinemaRoomUuid, String cinemaRoomName, String cinemaName, OffsetDateTime startTime, OffsetDateTime endTime, BigDecimal basePrice, ShowtimeStatus status) {
        this.uuid = uuid;
        this.movieUuid = movieUuid;
        this.movieTitle = movieTitle;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.cinemaRoomName = cinemaRoomName;
        this.cinemaName = cinemaName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.basePrice = basePrice;
        this.status = status;
    }

    public ShowtimeResponse(UUID uuid, UUID movieUuid, String movieTitle, String moviePosterUrl, UUID cinemaRoomUuid, String cinemaRoomName, String cinemaName, OffsetDateTime startTime, OffsetDateTime endTime, BigDecimal basePrice, ShowtimeStatus status) {
        this.uuid = uuid;
        this.movieUuid = movieUuid;
        this.movieTitle = movieTitle;
        this.moviePosterUrl = moviePosterUrl;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.cinemaRoomName = cinemaRoomName;
        this.cinemaName = cinemaName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.basePrice = basePrice;
        this.status = status;
    }

    public ShowtimeResponse(UUID uuid, UUID movieUuid, String movieTitle, String moviePosterUrl, UUID cinemaRoomUuid, String cinemaRoomName, String cinemaName, OffsetDateTime startTime, OffsetDateTime endTime, BigDecimal basePrice, BigDecimal vipPrice, BigDecimal couplePrice, ShowtimeStatus status) {
        this.uuid = uuid;
        this.movieUuid = movieUuid;
        this.movieTitle = movieTitle;
        this.moviePosterUrl = moviePosterUrl;
        this.cinemaRoomUuid = cinemaRoomUuid;
        this.cinemaRoomName = cinemaRoomName;
        this.cinemaName = cinemaName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.basePrice = basePrice;
        this.vipPrice = vipPrice;
        this.couplePrice = couplePrice;
        this.status = status;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public UUID getCinemaRoomUuid() {
        return cinemaRoomUuid;
    }

    public void setCinemaRoomUuid(UUID cinemaRoomUuid) {
        this.cinemaRoomUuid = cinemaRoomUuid;
    }

    public String getCinemaRoomName() {
        return cinemaRoomName;
    }

    public void setCinemaRoomName(String cinemaRoomName) {
        this.cinemaRoomName = cinemaRoomName;
    }

    public String getCinemaName() {
        return cinemaName;
    }

    public void setCinemaName(String cinemaName) {
        this.cinemaName = cinemaName;
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

    public ShowtimeStatus getStatus() {
        return status;
    }

    public void setStatus(ShowtimeStatus status) {
        this.status = status;
    }

    public String getMoviePosterUrl() {
        return moviePosterUrl;
    }

    public void setMoviePosterUrl(String moviePosterUrl) {
        this.moviePosterUrl = moviePosterUrl;
    }
}
