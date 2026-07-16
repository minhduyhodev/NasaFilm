package com.thdpv.movietheater.movie.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.movie.dto.response.ActorAvatarEnrichmentResponse;
import com.thdpv.movietheater.movie.service.ActorAvatarEnrichmentService;

@Component
public class ActorAvatarEnrichmentRunner {

    private static final Logger logger = LoggerFactory.getLogger(ActorAvatarEnrichmentRunner.class);

    private final ActorAvatarEnrichmentService enrichmentService;
    private final boolean enrichOnStartup;

    public ActorAvatarEnrichmentRunner(
            ActorAvatarEnrichmentService enrichmentService,
            @Value("${app.actor.enrich-avatars-on-startup:true}") boolean enrichOnStartup) {
        this.enrichmentService = enrichmentService;
        this.enrichOnStartup = enrichOnStartup;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void enrichOnStartup() {
        if (!enrichOnStartup) {
            return;
        }
        try {
            int backfilled = enrichmentService.backfillAvatarsFromSeedJson();
            ActorAvatarEnrichmentResponse result = enrichmentService.enrichMissingAvatars();
            logger.info(
                    "Actor avatar enrichment finished: jsonBackfill={}, candidates={}, enriched={}, skipped={}, failed={}",
                    backfilled,
                    result.totalCandidates(),
                    result.enriched(),
                    result.skipped(),
                    result.failed());
        } catch (Exception ex) {
            logger.warn("Actor avatar enrichment on startup failed: {}", ex.getMessage());
        }
    }
}
