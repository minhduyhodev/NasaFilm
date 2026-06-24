package com.thdpv.movietheater.booking.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public class ComboResponse {
    private UUID uuid;
    private String name;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private String status;

    public ComboResponse() {
    }

    public ComboResponse(UUID uuid, String name, String description, BigDecimal price, String imageUrl, String status) {
        this.uuid = uuid;
        this.name = name;
        this.description = description;
        this.price = price;
        this.imageUrl = imageUrl;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
