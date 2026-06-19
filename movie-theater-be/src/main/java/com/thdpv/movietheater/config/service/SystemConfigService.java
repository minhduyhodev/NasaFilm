package com.thdpv.movietheater.config.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.config.entity.SystemConfigEntry;
import com.thdpv.movietheater.config.repository.SystemConfigRepository;

@Service
public class SystemConfigService {

    private static final String CONFIG_KEY = "default";

    private final SystemConfigRepository systemConfigRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.vod.default-online-price:45000}")
    private BigDecimal fallbackOnlinePrice;

    public SystemConfigService(SystemConfigRepository systemConfigRepository, ObjectMapper objectMapper) {
        this.systemConfigRepository = systemConfigRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getConfig() {
        return systemConfigRepository.findById(CONFIG_KEY)
                .map(entry -> parseConfigJson(entry.getConfigJson()))
                .orElseGet(this::buildDefaultConfig);
    }

    @Transactional
    public Map<String, Object> saveConfig(Map<String, Object> incoming) {
        Map<String, Object> merged = mergeWithDefaults(incoming);
        SystemConfigEntry entry = systemConfigRepository.findById(CONFIG_KEY).orElseGet(() -> {
            SystemConfigEntry created = new SystemConfigEntry();
            created.setConfigKey(CONFIG_KEY);
            return created;
        });
        entry.setConfigJson(writeConfigJson(merged));
        systemConfigRepository.save(entry);
        return merged;
    }

    public BigDecimal getDefaultOnlinePrice() {
        Object value = getConfig().get("onlineStreamingPrice");
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.longValue());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.trim());
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return fallbackOnlinePrice;
    }

    private Map<String, Object> mergeWithDefaults(Map<String, Object> incoming) {
        Map<String, Object> merged = buildDefaultConfig();
        if (incoming != null) {
            merged.putAll(incoming);
        }
        return merged;
    }

    private Map<String, Object> buildDefaultConfig() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("startTime", "08:00");
        defaults.put("endTime", "23:30");
        defaults.put("intervalMinutes", 15);
        defaults.put("trailerBuffer", 10);
        defaults.put("goldenHourWeight", 1.2);
        defaults.put("weekendWeight", 1.5);
        defaults.put("ratingWeight", 1.0);
        defaults.put("genreWeight", 1.1);
        defaults.put("basePrice", 60000);
        defaults.put("vipPrice", 90000);
        defaults.put("couplePrice", 120000);
        defaults.put("onlineStreamingPrice", fallbackOnlinePrice.longValue());
        defaults.put("seatLockMinutes", 5);
        defaults.put("pointsEarningRatio", 5);
        defaults.put("pointsToCashValue", 1000);
        defaults.put("sessionTimeoutHours", 24);
        return defaults;
    }

    private Map<String, Object> parseConfigJson(String json) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {
            });
            return mergeWithDefaults(parsed);
        } catch (Exception e) {
            return buildDefaultConfig();
        }
    }

    private String writeConfigJson(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể lưu cấu hình hệ thống", e);
        }
    }
}
