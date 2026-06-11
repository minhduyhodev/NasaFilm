package com.thdpv.movietheater.movie.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class MovieMediaRequest {

    @NotBlank(message = "Media URL khong duoc de trong")
    @Size(max = 2000, message = "Media URL khong duoc vuot qua 2000 ky tu")
    private String mediaUrl;

    @NotBlank(message = "Loai media khong duoc de trong")
    @Pattern(regexp = "^(POSTER|BANNER|TRAILER|GALLERY)$", message = "Loai media khong hop le")
    private String mediaType;

    @Size(max = 255, message = "Tieu de media khong duoc vuot qua 255 ky tu")
    private String title;

    private Boolean isPrimary;

    @Min(value = 0, message = "Thu tu sap xep khong duoc am")
    private Integer sortOrder;

    public MovieMediaRequest() {
    }

    public MovieMediaRequest(String mediaUrl, String mediaType, String title, Boolean isPrimary, Integer sortOrder) {
        this.mediaUrl = mediaUrl;
        this.mediaType = mediaType;
        this.title = title;
        this.isPrimary = isPrimary;
        this.sortOrder = sortOrder;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Boolean getIsPrimary() {
        return isPrimary;
    }

    public void setIsPrimary(Boolean isPrimary) {
        this.isPrimary = isPrimary;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
