package com.thdpv.movietheater.cinema.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public class SeatTypeResponse {

    private UUID uuid;
    private String name;
    private BigDecimal basePrice;
    private Double priceModifier;
    private String description;

    public SeatTypeResponse() {
    }

    public SeatTypeResponse(UUID uuid, String name, BigDecimal basePrice, Double priceModifier, String description) {
        this.uuid = uuid;
        this.name = name;
        this.basePrice = basePrice;
        this.priceModifier = priceModifier;
        this.description = description;
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

    public BigDecimal getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(BigDecimal basePrice) {
        this.basePrice = basePrice;
    }

    public Double getPriceModifier() {
        return priceModifier;
    }

    public void setPriceModifier(Double priceModifier) {
        this.priceModifier = priceModifier;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
