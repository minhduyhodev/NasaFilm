package com.thdpv.movietheater.support.support;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

/**
 * Rate-limit customer support actions to reduce spam / AI cost abuse.
 */
@Component
public class SupportActionRateLimiter {

    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();

    /** AI / bot chat: max 12 messages / minute per user */
    public void assertAiChatAllowed(String userKey) {
        assertAllowed("support:ai:" + normalize(userKey), 12, Duration.ofMinutes(1));
    }

    /** Staff ticket messages: max 20 messages / minute per user */
    public void assertTicketMessageAllowed(String userKey) {
        assertAllowed("support:ticket-msg:" + normalize(userKey), 20, Duration.ofMinutes(1));
    }

    /** Create ticket / live request: max 5 / 10 minutes */
    public void assertTicketCreateAllowed(String userKey) {
        assertAllowed("support:ticket-create:" + normalize(userKey), 5, Duration.ofMinutes(10));
    }

    private String normalize(String key) {
        return key == null || key.isBlank() ? "anonymous" : key.trim().toLowerCase();
    }

    private void assertAllowed(String key, int maxRequests, Duration window) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - window.toMillis();

        Deque<Long> timestamps = requestLog.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequests) {
                throw new AppException(ErrorCode.SUPPORT_RATE_LIMITED);
            }
            timestamps.addLast(now);
        }
    }
}
