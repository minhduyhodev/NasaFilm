package com.thdpv.movietheater.movie.support;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.thdpv.movietheater.movie.util.StreamTokenUtils;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class MediaProxyRateLimiter {

    private static final int MAX_TRACKED_KEYS = 5_000;
    private static final Logger log = LoggerFactory.getLogger(MediaProxyRateLimiter.class);

    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();

    public void assertProxyAllowed(HttpServletRequest request) {
        assertAllowed("media:proxy:" + clientIp(request), 60, Duration.ofMinutes(1));
    }

    public void assertBorderAllowed(HttpServletRequest request) {
        assertAllowed("media:border:" + clientIp(request), 180, Duration.ofMinutes(1));
    }

    /** Video Range chunks — giới hạn cao hơn border redirect. */
    public void assertStreamAllowed(HttpServletRequest request, String streamToken) {
        String client = clientIp(request);
        assertAllowed("media:stream:ip:" + client, 600, Duration.ofMinutes(1));
        String tokenHash = StreamTokenUtils.hash(streamToken);
        if (tokenHash != null) {
            assertAllowed("media:stream:token:" + tokenHash, 600, Duration.ofMinutes(1));
        }
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        // Do not trust X-Forwarded-For directly. A trusted reverse proxy should
        // normalize remoteAddr through Spring's forward-header support.
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private void assertAllowed(String key, int maxRequests, Duration window) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - window.toMillis();

        if (requestLog.size() > MAX_TRACKED_KEYS) {
            evictStale(windowStart);
        }

        Deque<Long> timestamps = requestLog.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequests) {
                log.warn("Media rate limit exceeded keyType={}", key.substring(0, key.lastIndexOf(':')));
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Quá nhiều yêu cầu media. Vui lòng thử lại sau.");
            }
            timestamps.addLast(now);
        }
    }

    private void evictStale(long windowStart) {
        Iterator<Map.Entry<String, Deque<Long>>> it = requestLog.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Deque<Long>> entry = it.next();
            Deque<Long> timestamps = entry.getValue();
            synchronized (timestamps) {
                while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                    timestamps.pollFirst();
                }
                if (timestamps.isEmpty()) {
                    it.remove();
                }
            }
        }
    }
}
