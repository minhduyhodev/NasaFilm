package com.thdpv.movietheater.booking.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CounterBookingConfirmRequest {

    @NotNull(message = "Booking không được để trống")
    private UUID bookingUuid;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    @Pattern(regexp = "^(COUNTER_CASH|COUNTER_CARD|COUNTER_VIETQR)$", message = "Phương thức thanh toán không hợp lệ")
    private String paymentMethod;

    private String voucherCode;

    public CounterBookingConfirmRequest() {
    }

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getVoucherCode() {
        return voucherCode;
    }

    public void setVoucherCode(String voucherCode) {
        this.voucherCode = voucherCode;
    }
}
