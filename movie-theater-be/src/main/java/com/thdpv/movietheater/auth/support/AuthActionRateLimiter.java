package com.thdpv.movietheater.auth.support;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

@Component
public class AuthActionRateLimiter {

    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();

    public void assertLoginAllowed(String clientKey) {
        assertAllowed("auth:login:" + normalize(clientKey), 20, Duration.ofMinutes(1));
    }

    public void assertRegisterAllowed(String clientKey) {
        assertAllowed("auth:register:" + normalize(clientKey), 10, Duration.ofMinutes(10));
    }

    public void assertOtpVerifyAllowed(String clientKey) {
        assertAllowed("auth:otp:" + normalize(clientKey), 30, Duration.ofMinutes(10));
    }

    private String normalize(String key) {
        return key == null || key.isBlank() ? "unknown" : key.trim().toLowerCase();
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
                throw new AppException(ErrorCode.BAD_REQUEST,
                        "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.");
            }
            timestamps.addLast(now);
        }
    }
}
