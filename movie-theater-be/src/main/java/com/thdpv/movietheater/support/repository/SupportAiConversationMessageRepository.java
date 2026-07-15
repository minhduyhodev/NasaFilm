package com.thdpv.movietheater.support.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.thdpv.movietheater.support.entity.SupportAiConversationMessage;

public interface SupportAiConversationMessageRepository extends JpaRepository<SupportAiConversationMessage, UUID> {

    List<SupportAiConversationMessage> findBySessionUuidOrderByCreatedAtAsc(UUID sessionUuid);

    void deleteBySessionUuid(UUID sessionUuid);
}
