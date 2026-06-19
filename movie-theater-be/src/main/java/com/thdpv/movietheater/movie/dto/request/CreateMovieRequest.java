package com.thdpv.movietheater.movie.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class CreateMovieRequest {

    @NotBlank(message = "Ten phim khong duoc de trong")
    @Size(max = 255, message = "Ten phim khong duoc vuot qua 255 ky tu")
    private String title;

    @Size(max = 5000, message = "Mo ta phim khong duoc vuot qua 5000 ky tu")
    private String description;

    @NotNull(message = "Thoi luong phim khong duoc de trong")
    @Positive(message = "Thoi luong phim phai lon hon 0")
    private Integer durationMinutes;

    @NotNull(message = "Ngay khoi chieu khong duoc de trong")
    private LocalDate releaseDate;

    @NotBlank(message = "Trang thai phim khong duoc de trong")
    @Pattern(regexp = "^(DRAFT|COMING_SOON|NOW_SHOWING|ENDED|INACTIVE|DELETED)$", message = "Trang thai phim khong hop le")
    private String status;

    @NotBlank(message = "Phân loại độ tuổi là bắt buộc")
    @Pattern(regexp = "^(P|K|T13|T16|T18)$", message = "phan loai do tuoi khong hop le")
    private String ageRestriction;

    private List<UUID> genreUuids;

    private List<UUID> countryUuids;

    @Valid
    private List<MovieActorRequest> actors;

    @Valid
    private List<MovieMediaRequest> medias;

    @Size(max = 1000, message = "Link xem phim khong duoc vuot qua 1000 ky tu")
    private String streamingUrl;

    private String screeningMode;

    private BigDecimal onlinePrice;

    private Double rating;

    public CreateMovieRequest() {
    }

    public CreateMovieRequest(String title, String description, Integer durationMinutes, LocalDate releaseDate,
            String status, String ageRestriction, List<UUID> genreUuids, List<UUID> countryUuids,
            List<MovieActorRequest> actors, List<MovieMediaRequest> medias, String streamingUrl) {
        this.title = title;
        this.description = description;
        this.durationMinutes = durationMinutes;
        this.releaseDate = releaseDate;
        this.status = status;
        this.ageRestriction = ageRestriction;
        this.genreUuids = genreUuids;
        this.countryUuids = countryUuids;
        this.actors = actors;
        this.medias = medias;
        this.streamingUrl = streamingUrl;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public LocalDate getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAgeRestriction() {
        return ageRestriction;
    }

    public void setAgeRestriction(String ageRestriction) {
        this.ageRestriction = ageRestriction;
    }

    public List<UUID> getGenreUuids() {
        return genreUuids;
    }

    public void setGenreUuids(List<UUID> genreUuids) {
        this.genreUuids = genreUuids;
    }

    public List<UUID> getCountryUuids() {
        return countryUuids;
    }

    public void setCountryUuids(List<UUID> countryUuids) {
        this.countryUuids = countryUuids;
    }

    public List<MovieActorRequest> getActors() {
        return actors;
    }

    public void setActors(List<MovieActorRequest> actors) {
        this.actors = actors;
    }

    public List<MovieMediaRequest> getMedias() {
        return medias;
    }

    public void setMedias(List<MovieMediaRequest> medias) {
        this.medias = medias;
    }

    public String getStreamingUrl() {
        return streamingUrl;
    }

    public void setStreamingUrl(String streamingUrl) {
        this.streamingUrl = streamingUrl;
    }

    public String getScreeningMode() {
        return screeningMode;
    }

    public void setScreeningMode(String screeningMode) {
        this.screeningMode = screeningMode;
    }

    public BigDecimal getOnlinePrice() {
        return onlinePrice;
    }

    public void setOnlinePrice(BigDecimal onlinePrice) {
        this.onlinePrice = onlinePrice;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }
}
