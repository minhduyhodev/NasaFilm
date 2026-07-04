package com.thdpv.movietheater.support.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportTicketMessage;

public interface SupportTicketMessageRepository extends JpaRepository<SupportTicketMessage, UUID> {
    List<SupportTicketMessage> findByTicketUuidOrderByCreatedAtAsc(UUID ticketUuid);
}
