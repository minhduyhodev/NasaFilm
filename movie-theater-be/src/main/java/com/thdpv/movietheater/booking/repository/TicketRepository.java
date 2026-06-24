package com.thdpv.movietheater.booking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.booking.entity.Ticket;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByTicketCode(String ticketCode);
    void deleteByBookingUuid(UUID bookingUuid);
    List<Ticket> findByBookingUuid(UUID bookingUuid);
}
