package com.thdpv.movietheater.booking.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.thdpv.movietheater.booking.entity.Ticket;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByTicketCode(String ticketCode);
    void deleteByBookingUuid(UUID bookingUuid);
    List<Ticket> findByBookingUuid(UUID bookingUuid);

    /**
     * Atomic single-scan guard: flips a ticket to USED only if it is still ISSUED.
     * Returns 1 when this call won the check-in, 0 when another scan already used it.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Ticket t SET t.status = 'USED', t.checkedInAt = :now "
            + "WHERE t.uuid = :uuid AND t.status = 'ISSUED'")
    int markUsedIfIssued(@Param("uuid") UUID uuid, @Param("now") OffsetDateTime now);
}
