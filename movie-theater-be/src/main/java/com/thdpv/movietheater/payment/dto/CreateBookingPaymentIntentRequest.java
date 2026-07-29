package com.thdpv.movietheater.payment.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;

/**
 * Client sends checkout context only — amount is computed server-side from seats / VOD price.
 * Provide either {@code movieUuid} (VOD) or {@code showtimeUuid} + {@code seatUuids} (theater).
 */
public class CreateBookingPaymentIntentRequest {

    private UUID movieUuid;
    private UUID showtimeUuid;
    private List<UUID> seatUuids = new ArrayList<>();
    private List<ConfirmBookingRequest.ComboItem> combos = new ArrayList<>();
    private String promotionCode;
    private UUID orbitRoomUuid;
    private String currency = "vnd";

    public UUID getMovieUuid() {
        return movieUuid;
    }

    public void setMovieUuid(UUID movieUuid) {
        this.movieUuid = movieUuid;
    }

    public UUID getShowtimeUuid() {
        return showtimeUuid;
    }

    public void setShowtimeUuid(UUID showtimeUuid) {
        this.showtimeUuid = showtimeUuid;
    }

    public List<UUID> getSeatUuids() {
        return seatUuids;
    }

    public void setSeatUuids(List<UUID> seatUuids) {
        this.seatUuids = seatUuids != null ? seatUuids : new ArrayList<>();
    }

    public List<ConfirmBookingRequest.ComboItem> getCombos() {
        return combos;
    }

    public void setCombos(List<ConfirmBookingRequest.ComboItem> combos) {
        this.combos = combos != null ? combos : new ArrayList<>();
    }

    public String getPromotionCode() {
        return promotionCode;
    }

    public void setPromotionCode(String promotionCode) {
        this.promotionCode = promotionCode;
    }

    public UUID getOrbitRoomUuid() {
        return orbitRoomUuid;
    }

    public void setOrbitRoomUuid(UUID orbitRoomUuid) {
        this.orbitRoomUuid = orbitRoomUuid;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
