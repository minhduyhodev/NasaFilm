package com.thdpv.movietheater.booking.dto.request;

import java.util.List;

import com.thdpv.movietheater.booking.enums.ShowtimeStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AutoShowtimeSaveRequest {

    @NotEmpty(message = "Showtimes cannot be empty")
    private List<@Valid ShowtimeRequest> showtimes;

    /**
     * Optional publish target after creation.
     * DRAFT = keep as draft (default), SCHEDULED = list on schedule, OPEN_FOR_BOOKING = open ticket sales.
     */
    private ShowtimeStatus publishStatus;
}
