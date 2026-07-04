package com.thdpv.movietheater.booking.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CounterBookingConfirmRequest {

    @NotNull(message = "Khách hàng không được để trống")
    private UUID customerUuid;

    @NotNull(message = "Suất chiếu không được để trống")
    private UUID showtimeUuid;

    @NotEmpty(message = "Danh sách ghế không được để trống")
    private List<UUID> seatUuids = new ArrayList<>();

    @Valid
    private List<ConfirmBookingRequest.ComboItem> combos = new ArrayList<>();

    private String promotionCode;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Pattern(regexp = "^(COUNTER_CASH|COUNTER_CARD|COUNTER_VIETQR)$", message = "Phương thức thanh toán không hợp lệ")
    private String paymentMethod;

    public CounterBookingConfirmRequest() {
    }

    public UUID getCustomerUuid() {
        return customerUuid;
    }

    public void setCustomerUuid(UUID customerUuid) {
        this.customerUuid = customerUuid;
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
        this.seatUuids = seatUuids;
    }

    public List<ConfirmBookingRequest.ComboItem> getCombos() {
        return combos;
    }

    public void setCombos(List<ConfirmBookingRequest.ComboItem> combos) {
        this.combos = combos;
    }

    public String getPromotionCode() {
        return promotionCode;
    }

    public void setPromotionCode(String promotionCode) {
        this.promotionCode = promotionCode;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}
