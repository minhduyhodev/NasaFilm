package com.thdpv.movietheater.mission.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.mission.entity.MissionCampaign;
import com.thdpv.movietheater.mission.entity.MissionTemplate;
import com.thdpv.movietheater.mission.enums.MissionCampaignStatus;

class MissionRulesTest {

    @Test
    void resolveWindowDays_readsJsonValue() {
        assertEquals(14, MissionRules.resolveWindowDays("{\"windowDays\":14}", 30));
    }

    @Test
    void resolveWindowDays_fallsBackWhenMissing() {
        assertEquals(30, MissionRules.resolveWindowDays("{}", 30));
        assertEquals(3, MissionRules.resolveWindowDays("not-json", 3));
    }

    @Test
    void resolveWindowDays_enforcesMinimumOne() {
        assertEquals(1, MissionRules.resolveWindowDays("{\"windowDays\":0}", 30));
    }

    @Test
    void isTemplateVisible_requiresActiveCampaignInDateRange() {
        UUID campaignId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.parse("2026-07-01T12:00:00+07:00");

        MissionTemplate template = activeTemplate(campaignId);
        MissionCampaign activeCampaign = campaign(campaignId, MissionCampaignStatus.ACTIVE,
                OffsetDateTime.parse("2026-06-01T00:00:00+07:00"),
                OffsetDateTime.parse("2026-07-31T23:59:59+07:00"));

        assertTrue(MissionRules.isTemplateVisible(template, Map.of(campaignId, activeCampaign), now));

        MissionCampaign endedCampaign = campaign(campaignId, MissionCampaignStatus.ACTIVE,
                OffsetDateTime.parse("2026-06-01T00:00:00+07:00"),
                OffsetDateTime.parse("2026-06-30T23:59:59+07:00"));
        assertFalse(MissionRules.isTemplateVisible(template, Map.of(campaignId, endedCampaign), now));

        MissionCampaign draftCampaign = campaign(campaignId, MissionCampaignStatus.DRAFT, null, null);
        assertFalse(MissionRules.isTemplateVisible(template, Map.of(campaignId, draftCampaign), now));
    }

    @Test
    void isTemplateVisible_withoutCampaign_followsTemplateActiveFlag() {
        MissionTemplate template = activeTemplate(null);
        OffsetDateTime now = OffsetDateTime.now();

        assertTrue(MissionRules.isTemplateVisible(template, Map.of(), now));

        template.setActive(false);
        assertFalse(MissionRules.isTemplateVisible(template, Map.of(), now));
    }

    @Test
    void isImmutableProgressSource_marksReviewEventsAsPermanent() {
        assertTrue(MissionRules.isImmutableProgressSource("REVIEW_WITH_VIBE_TAG_CREATED"));
        assertFalse(MissionRules.isImmutableProgressSource("THEATER_BOOKING_CONFIRMED"));
    }

    private static MissionTemplate activeTemplate(UUID campaignUuid) {
        MissionTemplate template = new MissionTemplate();
        template.setActive(true);
        template.setCampaignUuid(campaignUuid);
        return template;
    }

    private static MissionCampaign campaign(
            UUID uuid,
            MissionCampaignStatus status,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt) {
        MissionCampaign campaign = new MissionCampaign();
        campaign.setUuid(uuid);
        campaign.setStatus(status);
        campaign.setStartsAt(startsAt);
        campaign.setEndsAt(endsAt);
        return campaign;
    }
}
