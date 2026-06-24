package com.thdpv.movietheater.config.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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

    public int getSeatLockMinutes() {
        return readInt(getConfig().get("seatLockMinutes"), 5, 1, 30);
    }

    public int getSeatLockTtlSeconds() {
        return getSeatLockMinutes() * 60;
    }

    public int getMaxSeatsPerBooking() {
        return readInt(getConfig().get("maxSeatsPerBooking"), 8, 1, 20);
    }

    public double getOnlineWatchLockMultiplier() {
        return readDouble(getConfig().get("onlineWatchLockMultiplier"), 2.0, 0.5, 10.0);
    }

    public int getPointsToCashValue() {
        return readInt(getConfig().get("pointsToCashValue"), 1000, 1, 1_000_000);
    }

    public int getCancellationCutoffMinutes() {
        return readInt(getConfig().get("cancellationCutoffMinutes"), 60, 0, 24 * 60);
    }

    public int getCancellationFeePercent() {
        return readInt(getConfig().get("cancellationFeePercent"), 10, 0, 100);
    }

    public boolean isCustomerRefundEnabled() {
        return readBoolean(getConfig().get("customerRefundEnabled"), true);
    }

    public boolean isFullRefundOnShowtimeCancel() {
        return readBoolean(getConfig().get("fullRefundOnShowtimeCancel"), true);
    }

    public boolean isRefundManualApprovalRequired() {
        return readBoolean(getConfig().get("refundManualApprovalRequired"), false);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRoomTypes() {
        Object value = getConfig().get("roomTypes");
        if (value instanceof List<?> list && !list.isEmpty()) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            if (!result.isEmpty()) {
                return result;
            }
        }
        return defaultRoomTypes();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getScreeningFormats() {
        Object value = getConfig().get("screeningFormats");
        if (value instanceof List<?> list && !list.isEmpty()) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add(new LinkedHashMap<>((Map<String, Object>) map));
                }
            }
            if (!result.isEmpty()) {
                return result;
            }
        }
        return defaultScreeningFormats();
    }

    private Map<String, Object> mergeWithDefaults(Map<String, Object> incoming) {
        Map<String, Object> merged = buildDefaultConfig();
        if (incoming != null) {
            merged.putAll(incoming);
        }
        if (!(merged.get("roomTypes") instanceof List<?> list) || list.isEmpty()) {
            merged.put("roomTypes", defaultRoomTypes());
        }
        if (!(merged.get("screeningFormats") instanceof List<?> formats) || formats.isEmpty()) {
            merged.put("screeningFormats", defaultScreeningFormats());
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
        defaults.put("maxSeatsPerBooking", 8);
        defaults.put("onlineWatchLockMultiplier", 2.0);
        defaults.put("pointsEarningRatio", 5);
        defaults.put("pointsToCashValue", 1000);
        defaults.put("sessionTimeoutHours", 24);
        defaults.put("cancellationCutoffMinutes", 60);
        defaults.put("cancellationFeePercent", 10);
        defaults.put("customerRefundEnabled", true);
        defaults.put("fullRefundOnShowtimeCancel", true);
        defaults.put("refundManualApprovalRequired", false);
        defaults.put("roomTypes", defaultRoomTypes());
        defaults.put("screeningFormats", defaultScreeningFormats());
        return defaults;
    }

    private List<Map<String, Object>> defaultRoomTypes() {
        List<Map<String, Object>> types = new ArrayList<>();
        types.add(roomTypeEntry("STANDARD", "Standard 2D/3D", true));
        types.add(roomTypeEntry("IMAX", "IMAX Laser", true));
        types.add(roomTypeEntry("VIP", "VIP Gold Class", true));
        types.add(roomTypeEntry("DOLBY_ATMOS", "Dolby Atmos", true));
        types.add(roomTypeEntry("FOUR_DX", "4DX Motion Cinema", true));
        return types;
    }

    private List<Map<String, Object>> defaultScreeningFormats() {
        List<Map<String, Object>> formats = new ArrayList<>();
        formats.add(formatEntry("2D", "2D Phụ đề / Lồng tiếng", true));
        formats.add(formatEntry("3D", "3D", true));
        formats.add(formatEntry("IMAX", "IMAX Laser", true));
        formats.add(formatEntry("4DX", "4DX Motion", true));
        formats.add(formatEntry("DOLBY_ATMOS", "Dolby Atmos", true));
        formats.add(formatEntry("SCREENX", "ScreenX", true));
        return formats;
    }

    private Map<String, Object> roomTypeEntry(String value, String label, boolean enabled) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("value", value);
        entry.put("label", label);
        entry.put("enabled", enabled);
        return entry;
    }

    private Map<String, Object> formatEntry(String value, String label, boolean enabled) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("value", value);
        entry.put("label", label);
        entry.put("enabled", enabled);
        return entry;
    }

    private int readInt(Object value, int fallback, int min, int max) {
        int parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.intValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private double readDouble(Object value, double fallback, double min, double max) {
        double parsed = fallback;
        if (value instanceof Number number) {
            parsed = number.doubleValue();
        } else if (value instanceof String text && !text.isBlank()) {
            try {
                parsed = Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        } else {
            return fallback;
        }
        return Math.max(min, Math.min(max, parsed));
    }

    private boolean readBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String text && !text.isBlank()) {
            return Boolean.parseBoolean(text.trim());
        }
        return fallback;
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
