package com.thdpv.movietheater.support.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SupportContentModerationServiceTest {

    @Test
    void parseVerdictDetectsSensitiveRelatedUnrelated() {
        assertEquals(
                SupportContentModerationService.ImageVerdict.SENSITIVE,
                SupportContentModerationService.parseVerdict("SENSITIVE"));
        assertEquals(
                SupportContentModerationService.ImageVerdict.RELATED,
                SupportContentModerationService.parseVerdict("related please"));
        assertEquals(
                SupportContentModerationService.ImageVerdict.UNRELATED,
                SupportContentModerationService.parseVerdict("UNRELATED\n"));
        assertEquals(
                SupportContentModerationService.ImageVerdict.UNKNOWN,
                SupportContentModerationService.parseVerdict("maybe"));
    }

    @Test
    void toFastVisionUrlInsertsCloudinaryTransform() {
        String raw = "https://res.cloudinary.com/demo/image/upload/v1/support-attachments/a.jpg";
        String fast = SupportContentModerationService.toFastVisionUrl(raw);
        assertEquals(
                "https://res.cloudinary.com/demo/image/upload/w_768,c_limit,q_auto,f_jpg/v1/support-attachments/a.jpg",
                fast);
    }
}
