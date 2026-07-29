package com.thdpv.movietheater.movie.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class StreamTokenUtilsTest {

    @Test
    void generateCreatesUniqueHighEntropyUrlSafeTokens() {
        String first = StreamTokenUtils.generate();
        String second = StreamTokenUtils.generate();

        assertNotEquals(first, second);
        assertTrue(first.matches("[A-Za-z0-9_-]{43}"));
    }

    @Test
    void hashIsStableAndDoesNotStoreRawToken() {
        String raw = "sample-stream-token";
        String hash = StreamTokenUtils.hash(raw);

        assertEquals(64, hash.length());
        assertNotEquals(raw, hash);
        assertEquals(hash, StreamTokenUtils.hash(raw));
    }

    @Test
    void matchesAcceptsHashedOrLegacyPlaintextStoredTokens() {
        String raw = "sample-stream-token";

        assertTrue(StreamTokenUtils.matches(raw, StreamTokenUtils.hash(raw)));
        assertTrue(StreamTokenUtils.matches(raw, raw)); // legacy plaintext row
        assertFalse(StreamTokenUtils.matches("other-token", StreamTokenUtils.hash(raw)));
        assertTrue(StreamTokenUtils.looksLikeHash(StreamTokenUtils.hash(raw)));
        assertFalse(StreamTokenUtils.looksLikeHash(raw));
    }

    @Test
    void fingerprintIdentifiesSessionWithoutExposingBearerToken() {
        String raw = "sample-stream-token";
        String storedHash = StreamTokenUtils.hash(raw);
        String fingerprint = StreamTokenUtils.fingerprint(raw);

        assertEquals(24, fingerprint.length());
        assertNotEquals(raw, fingerprint);
        assertTrue(StreamTokenUtils.matchesFingerprint(fingerprint, storedHash));
        assertFalse(StreamTokenUtils.matchesFingerprint("000000000000000000000000", storedHash));
    }
}
