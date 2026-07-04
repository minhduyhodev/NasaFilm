package com.thdpv.movietheater.booking.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.thdpv.movietheater.booking.repository.BookingNativeRepository;
import com.thdpv.movietheater.booking.repository.BookingNativeRepository.SeatGapState;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

@Service
public class SeatGapValidationService {

    private final BookingNativeRepository bookingNativeRepository;

    public SeatGapValidationService(BookingNativeRepository bookingNativeRepository) {
        this.bookingNativeRepository = bookingNativeRepository;
    }

    public void validateNoSingleSeatGap(UUID showtimeUuid, Collection<UUID> selectedSeatUuids, OffsetDateTime now) {
        if (selectedSeatUuids == null || selectedSeatUuids.isEmpty()) {
            return;
        }
        Set<UUID> selectedSeatUuidSet = new LinkedHashSet<>(selectedSeatUuids);
        Map<String, List<GapSeat>> seatsByRow = new LinkedHashMap<>();

        for (SeatGapState state : bookingNativeRepository.loadSeatGapStates(showtimeUuid, now)) {
            boolean selectedByUser = selectedSeatUuidSet.contains(state.seatUuid());
            boolean unavailable = selectedByUser
                    || state.booked()
                    || state.locked()
                    || (state.seatStatus() != null && !"ACTIVE".equalsIgnoreCase(state.seatStatus()));
            GapSeat gapSeat = new GapSeat(state.rowName(), state.seatNumber(), unavailable, selectedByUser);
            seatsByRow.computeIfAbsent(gapSeat.rowName(), ignored -> new ArrayList<>()).add(gapSeat);
        }

        for (List<GapSeat> rowSeats : seatsByRow.values()) {
            int segmentStart = 0;
            while (segmentStart < rowSeats.size()) {
                int segmentEnd = segmentStart;
                while (segmentEnd + 1 < rowSeats.size()
                        && rowSeats.get(segmentEnd + 1).seatNumber() == rowSeats.get(segmentEnd).seatNumber() + 1) {
                    segmentEnd++;
                }

                for (int i = segmentStart; i <= segmentEnd; i++) {
                    GapSeat current = rowSeats.get(i);
                    if (current.unavailable()) {
                        continue;
                    }

                    boolean leftUnavailable = (i == segmentStart) || rowSeats.get(i - 1).unavailable();
                    boolean rightUnavailable = (i == segmentEnd) || rowSeats.get(i + 1).unavailable();

                    if (leftUnavailable && rightUnavailable) {
                        boolean leftSelectedByUser = (i != segmentStart) && rowSeats.get(i - 1).selectedByUser();
                        boolean rightSelectedByUser = (i != segmentEnd) && rowSeats.get(i + 1).selectedByUser();
                        if (leftSelectedByUser || rightSelectedByUser) {
                            throw new AppException(ErrorCode.BAD_REQUEST, "Khong duoc de trong 1 ghe le bi kep giua");
                        }
                    }
                }
                segmentStart = segmentEnd + 1;
            }
        }
    }

    private record GapSeat(String rowName, int seatNumber, boolean unavailable, boolean selectedByUser) {
    }
}
