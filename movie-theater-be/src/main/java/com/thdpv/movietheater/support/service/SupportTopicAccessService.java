package com.thdpv.movietheater.support.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.thdpv.movietheater.support.repository.SupportTicketRepository;

@Service
public class SupportTopicAccessService {

    private static final String USER_TOPIC_PREFIX = "/topic/support/";

    private final SupportTicketRepository supportTicketRepository;

    public SupportTopicAccessService(SupportTicketRepository supportTicketRepository) {
        this.supportTicketRepository = supportTicketRepository;
    }

    public boolean isSupportUserTopic(String destination) {
        if (destination == null || !destination.startsWith(USER_TOPIC_PREFIX)) {
            return false;
        }
        return destination.length() > USER_TOPIC_PREFIX.length();
    }

    public String parseTicketCode(String destination) {
        if (!isSupportUserTopic(destination)) {
            return null;
        }
        return destination.substring(USER_TOPIC_PREFIX.length()).trim();
    }

    @Transactional(readOnly = true)
    public boolean canSubscribe(String userEmail, String ticketCode) {
        if (!StringUtils.hasText(userEmail) || !StringUtils.hasText(ticketCode)) {
            return false;
        }
        return supportTicketRepository.findByTicketCode(ticketCode.trim())
                .map(ticket -> ticket.getOwnerEmail().equalsIgnoreCase(userEmail.trim()))
                .orElse(false);
    }
}
