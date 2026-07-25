package com.thdpv.movietheater.movie.dto.response;

import java.util.List;

public record ActorAvatarEnrichmentResponse(
        int totalCandidates,
        int enriched,
        int skipped,
        int failed,
        List<ActorAvatarEnrichmentItem> items) {

    public record ActorAvatarEnrichmentItem(
            String actorUuid,
            String fullName,
            String status,
            String avatarUrl,
            String source) {
    }
}
