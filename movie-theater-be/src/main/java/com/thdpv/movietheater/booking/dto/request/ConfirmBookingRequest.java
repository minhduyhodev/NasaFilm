package com.thdpv.movietheater.booking.dto.request;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class ConfirmBookingRequest {

    @NotNull(message = "Showtime uuid khong duoc de trong")
    private UUID showtimeUuid;

    @NotEmpty(message = "Danh sach ghe khong duoc de trong")
    private List<UUID> seatUuids = new ArrayList<>();

    @Valid
    private List<ComboItem> combos = new ArrayList<>();

    private String promotionCode;

    /** wallet | card | apple | momo — mapped by PaymentService when provider=mock */
    private String paymentMethod;

    /** Present when checkout originates from an Orbit group room (host pays all). */
    private UUID orbitRoomUuid;

    /** Stripe PaymentIntent id (pi_...) for card payments; the server reconciles the paid amount against it. */
    private String paymentIntentId;

    public ConfirmBookingRequest() {
    }

    public ConfirmBookingRequest(UUID showtimeUuid, List<UUID> seatUuids, List<ComboItem> combos) {
        this.showtimeUuid = showtimeUuid;
        this.seatUuids = seatUuids;
        this.combos = combos;
        this.promotionCode = null;
    }

    public ConfirmBookingRequest(UUID showtimeUuid, List<UUID> seatUuids, List<ComboItem> combos, String promotionCode) {
        this.showtimeUuid = showtimeUuid;
        this.seatUuids = seatUuids;
        this.combos = combos;
        this.promotionCode = promotionCode;
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

    public UUID getOrbitRoomUuid() {
        return orbitRoomUuid;
    }

    public void setOrbitRoomUuid(UUID orbitRoomUuid) {
        this.orbitRoomUuid = orbitRoomUuid;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
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

    public List<ComboItem> getCombos() {
        return combos;
    }

    public void setCombos(List<ComboItem> combos) {
        this.combos = combos;
    }

    public static class ComboItem {

        @NotNull(message = "Combo uuid khong duoc de trong")
        private UUID comboUuid;

        @Positive(message = "So luong combo phai lon hon 0")
        private Integer quantity;

        public ComboItem() {
        }

        public ComboItem(UUID comboUuid, Integer quantity) {
            this.comboUuid = comboUuid;
            this.quantity = quantity;
        }

        public UUID getComboUuid() {
            return comboUuid;
        }

        public void setComboUuid(UUID comboUuid) {
            this.comboUuid = comboUuid;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }
}
