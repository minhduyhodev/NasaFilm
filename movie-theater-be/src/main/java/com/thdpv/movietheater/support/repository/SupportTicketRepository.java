package com.thdpv.movietheater.support.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportTicket;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findAllByOrderByCreatedAtDesc();

    List<SupportTicket> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);

    Optional<SupportTicket> findByTicketCode(String ticketCode);

    boolean existsByTicketCode(String ticketCode);
}
