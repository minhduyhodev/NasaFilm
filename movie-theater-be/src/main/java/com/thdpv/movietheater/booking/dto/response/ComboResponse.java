package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public class ComboResponse {
    private UUID uuid;
    private String name;
    private BigDecimal price;
    private String status;

    public ComboResponse() {
    }

    public ComboResponse(UUID uuid, String name, BigDecimal price, String status) {
        this.uuid = uuid;
        this.name = name;
        this.price = price;
        this.status = status;
    }

    public UUID getUuid() {
        return uuid;
    }

    public void setUuid(UUID uuid) {
        this.uuid = uuid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
