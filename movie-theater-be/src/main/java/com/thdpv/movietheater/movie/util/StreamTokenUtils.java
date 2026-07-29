package com.thdpv.movietheater.movie.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

public final class StreamTokenUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    /** SHA-256 hex length — hashed tokens always look like this. */
    private static final int HASH_HEX_LENGTH = 64;

    private StreamTokenUtils() {
    }

    public static String generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    public static String fingerprint(String rawToken) {
        String hashed = hash(rawToken);
        return hashed == null ? null : hashed.substring(0, 24);
    }

    public static boolean matchesFingerprint(String fingerprint, String storedToken) {
        if (fingerprint == null || fingerprint.isBlank() || storedToken == null || storedToken.length() < 24) {
            return false;
        }
        return MessageDigest.isEqual(
                fingerprint.trim().getBytes(StandardCharsets.US_ASCII),
                storedToken.substring(0, 24).getBytes(StandardCharsets.US_ASCII));
    }

    /** True when the DB value is a SHA-256 hex digest (post-migration storage). */
    public static boolean looksLikeHash(String storedToken) {
        if (storedToken == null || storedToken.length() != HASH_HEX_LENGTH) {
            return false;
        }
        for (int i = 0; i < storedToken.length(); i++) {
            char c = storedToken.charAt(i);
            boolean hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
            if (!hex) {
                return false;
            }
        }
        return true;
    }

    public static boolean matches(String rawToken, String storedToken) {
        if (rawToken == null || storedToken == null) {
            return false;
        }
        String trimmedStored = storedToken.trim();
        String hashed = hash(rawToken);
        if (hashed != null && MessageDigest.isEqual(
                hashed.getBytes(StandardCharsets.US_ASCII),
                trimmedStored.getBytes(StandardCharsets.US_ASCII))) {
            return true;
        }
        // Legacy rows stored the raw token before hashing was deployed.
        if (!looksLikeHash(trimmedStored)) {
            return MessageDigest.isEqual(
                    rawToken.trim().getBytes(StandardCharsets.UTF_8),
                    trimmedStored.getBytes(StandardCharsets.UTF_8));
        }
        return false;
    }
}
