package com.thdpv.movietheater.mission.util;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;
import com.thdpv.movietheater.mission.enums.MissionEventType;

public final class MissionRules {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private MissionRules() {
    }

    public static int resolveWindowDays(String conditionJson, int defaultDays) {
        if (conditionJson == null || conditionJson.isBlank()) {
            return defaultDays;
        }
        try {
            JsonNode node = OBJECT_MAPPER.readTree(conditionJson);
            if (node != null && node.has("windowDays") && node.get("windowDays").canConvertToInt()) {
                return Math.max(1, node.get("windowDays").asInt(defaultDays));
            }
        } catch (Exception ignored) {
            // fall back to default
        }
        return defaultDays;
    }

    public static boolean isTemplateVisible(
            MissionTemplate template,
            Map<UUID, MissionCampaign> campaigns,
            OffsetDateTime now) {
        if (template == null || now == null) {
            return false;
        }
        if (!template.isActive()) {
            return false;
        }
        if (template.getStartsAt() != null && now.isBefore(template.getStartsAt())) {
            return false;
        }
        if (template.getEndsAt() != null && now.isAfter(template.getEndsAt())) {
            return false;
        }
        if (template.getCampaignUuid() == null) {
            return true;
        }
        MissionCampaign campaign = campaigns != null ? campaigns.get(template.getCampaignUuid()) : null;
        if (campaign == null || campaign.getStatus() != MissionCampaignStatus.ACTIVE) {
            return false;
        }
        if (campaign.getStartsAt() != null && now.isBefore(campaign.getStartsAt())) {
            return false;
        }
        return campaign.getEndsAt() == null || !now.isAfter(campaign.getEndsAt());
    }

    /**
     * Review mission progress is earned at submission time and is not reversed when a review is
     * reported or hidden by moderation.
     */
    public static boolean isImmutableProgressSource(String sourceType) {
        return MissionEventType.REVIEW_WITH_VIBE_TAG_CREATED.name().equals(sourceType);
    }
}
