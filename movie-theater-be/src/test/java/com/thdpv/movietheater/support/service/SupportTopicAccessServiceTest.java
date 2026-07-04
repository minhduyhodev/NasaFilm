package com.thdpv.movietheater.support.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.thdpv.movietheater.support.entity.SupportTicket;
import com.thdpv.movietheater.support.repository.SupportTicketRepository;

@ExtendWith(MockitoExtension.class)
class SupportTopicAccessServiceTest {

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @InjectMocks
    private SupportTopicAccessService supportTopicAccessService;

    @Test
    void canSubscribeShouldAllowTicketOwner() {
        SupportTicket ticket = new SupportTicket();
        ticket.setTicketCode("SUP-001");
        ticket.setOwnerEmail("owner@example.com");

        when(supportTicketRepository.findByTicketCode("SUP-001")).thenReturn(Optional.of(ticket));

        assertTrue(supportTopicAccessService.canSubscribe("owner@example.com", "SUP-001"));
        assertFalse(supportTopicAccessService.canSubscribe("other@example.com", "SUP-001"));
    }

    @Test
    void parseTicketCodeShouldExtractFromTopic() {
        assertTrue(supportTopicAccessService.isSupportUserTopic("/topic/support/SUP-001"));
        assertEquals("SUP-001", supportTopicAccessService.parseTicketCode("/topic/support/SUP-001"));
        assertFalse(supportTopicAccessService.isSupportUserTopic("/topic/admin/support"));
    }
}
