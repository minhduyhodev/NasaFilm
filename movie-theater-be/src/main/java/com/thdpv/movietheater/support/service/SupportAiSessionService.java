package com.thdpv.movietheater.support.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.support.dto.response.SupportAiMessageResponse;
import com.thdpv.movietheater.support.dto.response.SupportAiSessionResponse;
import com.thdpv.movietheater.support.entity.SupportAiConversationMessage;
import com.thdpv.movietheater.support.entity.SupportAiSession;
import com.thdpv.movietheater.support.repository.SupportAiConversationMessageRepository;
import com.thdpv.movietheater.support.repository.SupportAiSessionRepository;

/**
 * Persists NASA BOT AI conversations server-side so a chat session lives in the DB,
 * not only in the browser. Both the customer message and the bot reply are stored.
 */
@Service
public class SupportAiSessionService {

    private static final int TITLE_MAX = 120;
    private static final int PREVIEW_MAX = 300;

    private static final TypeReference<List<Map<String, String>>> CHOICES_TYPE =
            new TypeReference<List<Map<String, String>>>() {};

    private final SupportAiSessionRepository sessionRepository;
    private final SupportAiConversationMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    public SupportAiSessionService(
            SupportAiSessionRepository sessionRepository,
            SupportAiConversationMessageRepository messageRepository,
            ObjectMapper objectMapper) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Append a user message + bot reply to an existing session (by code) or start a new one.
     *
     * @return the session the exchange was written to (never null on success).
     */
    @Transactional
    public SupportAiSession recordExchange(
            String sessionCode,
            String ownerEmail,
            String ownerName,
            String mode,
            String userMessage,
            String botReply) {
        return recordExchange(sessionCode, ownerEmail, ownerName, mode, userMessage, botReply, null);
    }

    @Transactional
    public SupportAiSession recordExchange(
            String sessionCode,
            String ownerEmail,
            String ownerName,
            String mode,
            String userMessage,
            String botReply,
            List<Map<String, String>> botChoices) {
        String normalizedOwner = normalizeEmail(ownerEmail);
        SupportAiSession session = resolveSession(sessionCode, normalizedOwner);
        boolean isNew = session == null;
        if (isNew) {
            session = new SupportAiSession();
            session.setSessionCode(generateSessionCode());
            session.setOwnerEmail(normalizedOwner);
            session.setOwnerName(trimOrNull(ownerName));
            session.setMode(normalizeMode(mode));
            session.setTitle(truncate(userMessage, TITLE_MAX));
        }
        session = sessionRepository.save(session);

        int added = 0;
        if (userMessage != null && !userMessage.isBlank()) {
            saveMessage(session.getUuid(), "USER", userMessage.trim(), null);
            added++;
        }
        if (botReply != null && !botReply.isBlank()) {
            saveMessage(session.getUuid(), "BOT", botReply.trim(), serializeChoices(botChoices));
            added++;
        }

        String preview = botReply != null && !botReply.isBlank() ? botReply : userMessage;
        session.setLastMessage(truncate(preview, PREVIEW_MAX));
        session.setLastRole(botReply != null && !botReply.isBlank() ? "BOT" : "USER");
        session.setMessageCount(session.getMessageCount() + added);
        if (session.getTitle() == null || session.getTitle().isBlank()) {
            session.setTitle(truncate(userMessage, TITLE_MAX));
        }
        return sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public List<SupportAiSessionResponse> listMine(String ownerEmail) {
        String normalizedOwner = normalizeEmail(ownerEmail);
        if (normalizedOwner == null) {
            return List.of();
        }
        return sessionRepository.findByOwnerEmailIgnoreCaseOrderByUpdatedAtDesc(normalizedOwner)
                .stream()
                .map(this::mapSession)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupportAiMessageResponse> listMessages(String sessionCode, String ownerEmail) {
        SupportAiSession session = sessionRepository.findBySessionCode(sessionCode)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên chat."));
        assertOwnership(session, ownerEmail);
        return messageRepository.findBySessionUuidOrderByCreatedAtAsc(session.getUuid())
                .stream()
                .map(this::mapMessage)
                .toList();
    }

    private SupportAiSession resolveSession(String sessionCode, String normalizedOwner) {
        if (sessionCode == null || sessionCode.isBlank()) {
            return null;
        }
        SupportAiSession session = sessionRepository.findBySessionCode(sessionCode.trim()).orElse(null);
        if (session == null) {
            return null;
        }
        // If the stored session belongs to someone else, don't append to it — start fresh.
        if (session.getOwnerEmail() != null && normalizedOwner != null
                && !session.getOwnerEmail().equalsIgnoreCase(normalizedOwner)) {
            return null;
        }
        return session;
    }

    private void assertOwnership(SupportAiSession session, String ownerEmail) {
        String normalizedOwner = normalizeEmail(ownerEmail);
        if (session.getOwnerEmail() != null
                && (normalizedOwner == null || !session.getOwnerEmail().equalsIgnoreCase(normalizedOwner))) {
            throw new AppException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem phiên chat này.");
        }
    }

    private void saveMessage(UUID sessionUuid, String role, String content, String choicesJson) {
        SupportAiConversationMessage message = new SupportAiConversationMessage();
        message.setSessionUuid(sessionUuid);
        message.setRole(role);
        message.setContent(content);
        message.setChoices(choicesJson);
        messageRepository.save(message);
    }

    private String serializeChoices(List<Map<String, String>> choices) {
        if (choices == null || choices.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(choices);
        } catch (Exception e) {
            return null;
        }
    }

    private List<Map<String, String>> parseChoices(String choicesJson) {
        if (choicesJson == null || choicesJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(choicesJson, CHOICES_TYPE);
        } catch (Exception e) {
            return null;
        }
    }

    private String generateSessionCode() {
        String code;
        do {
            code = "AIS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (sessionRepository.existsBySessionCode(code));
        return code;
    }

    private SupportAiSessionResponse mapSession(SupportAiSession session) {
        SupportAiSessionResponse response = new SupportAiSessionResponse();
        response.setUuid(session.getUuid());
        response.setSessionCode(session.getSessionCode());
        response.setOwnerEmail(session.getOwnerEmail());
        response.setOwnerName(session.getOwnerName());
        response.setMode(session.getMode());
        response.setTitle(session.getTitle());
        response.setLastMessage(session.getLastMessage());
        response.setLastRole(session.getLastRole());
        response.setMessageCount(session.getMessageCount());
        response.setCreatedAt(session.getCreatedAt());
        response.setUpdatedAt(session.getUpdatedAt());
        return response;
    }

    private SupportAiMessageResponse mapMessage(SupportAiConversationMessage message) {
        SupportAiMessageResponse response = new SupportAiMessageResponse();
        response.setUuid(message.getUuid());
        response.setSessionUuid(message.getSessionUuid());
        response.setRole(message.getRole());
        response.setContent(message.getContent());
        response.setChoices(parseChoices(message.getChoices()));
        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "ANSWER";
        }
        return mode.trim().toUpperCase();
    }

    private String normalizeEmail(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase();
    }

    private String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max).trim() + "…";
    }
}
