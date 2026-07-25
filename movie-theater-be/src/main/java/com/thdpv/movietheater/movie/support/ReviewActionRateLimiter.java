package com.thdpv.movietheater.movie.support;

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
public class ReviewActionRateLimiter {

    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();

    public void assertCreateReviewAllowed(String userUuid) {
        assertAllowed("review:create:" + userUuid, 5, Duration.ofMinutes(1));
    }

    public void assertReportAllowed(String userUuid) {
        assertAllowed("review:report:" + userUuid, 10, Duration.ofHours(1));
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
                throw new AppException(ErrorCode.REVIEW_RATE_LIMITED);
            }
            timestamps.addLast(now);
        }
    }
}
