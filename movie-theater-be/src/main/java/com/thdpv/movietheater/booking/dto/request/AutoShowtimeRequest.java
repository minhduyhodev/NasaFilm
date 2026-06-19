package com.thdpv.movietheater.booking.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AutoShowtimeRequest {

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Cinema UUID is required")
    private UUID cinemaUuid;

    @NotEmpty(message = "Room UUIDs cannot be empty")
    private List<UUID> roomUuids;

    @NotEmpty(message = "Movie UUIDs cannot be empty")
    private List<UUID> movieUuids;

    @NotNull(message = "Start time limit is required")
    private LocalTime startTime;

    @NotNull(message = "End time limit is required")
    private LocalTime endTime;

    @NotNull(message = "Base price is required")
    @Positive(message = "Base price must be positive")
    private BigDecimal basePrice;

    @NotNull(message = "VIP price is required")
    @Positive(message = "VIP price must be positive")
    private BigDecimal vipPrice;

    @NotNull(message = "Couple price is required")
    @Positive(message = "Couple price must be positive")
    private BigDecimal couplePrice;

    private Integer intervalMinutes = 15;

    private Integer trailerBuffer = 10;

    private Double goldenHourWeight = 1.0;
    private Double weekendWeight = 1.0;
    private Double ratingWeight = 1.0;
    private Double genreWeight = 1.0;
}
