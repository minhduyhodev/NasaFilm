package com.thdpv.movietheater.support.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportTicket;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findAllByOrderByCreatedAtDesc();

    Page<SupportTicket> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<SupportTicket> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);

    List<SupportTicket> findByLiveRequestedTrueOrderByCreatedAtAsc();

    Optional<SupportTicket> findByTicketCode(String ticketCode);

    boolean existsByTicketCode(String ticketCode);
}
