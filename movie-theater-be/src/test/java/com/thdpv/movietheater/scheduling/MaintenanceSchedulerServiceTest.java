package com.thdpv.movietheater.scheduling;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.booking.service.BookingService;
import com.thdpv.movietheater.booking.service.ShowtimeService;

@ExtendWith(MockitoExtension.class)
class MaintenanceSchedulerServiceTest {

    @Mock
    private ShowtimeService showtimeService;

    @Mock
    private BookingService bookingService;

    @InjectMocks
    private MaintenanceSchedulerService maintenanceSchedulerService;

    @Test
    void finishExpiredShowtimesScheduled_InvokesShowtimeService() {
        when(showtimeService.finishExpiredShowtimes()).thenReturn(1);

        maintenanceSchedulerService.finishExpiredShowtimesScheduled();

        verify(showtimeService).finishExpiredShowtimes();
    }

    @Test
    void revokeExpiredVodTokensScheduled_InvokesBookingService() {
        when(bookingService.revokeExpiredVodStreamTokens()).thenReturn(2);

        maintenanceSchedulerService.revokeExpiredVodTokensScheduled();

        verify(bookingService).revokeExpiredVodStreamTokens();
    }
}
