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

    public static boolean matches(String rawToken, String storedToken) {
        if (rawToken == null || storedToken == null) {
            return false;
        }
        String hashed = hash(rawToken);
        return MessageDigest.isEqual(
                hashed.getBytes(StandardCharsets.US_ASCII),
                storedToken.trim().getBytes(StandardCharsets.US_ASCII))
                || MessageDigest.isEqual(
                        rawToken.trim().getBytes(StandardCharsets.UTF_8),
                        storedToken.trim().getBytes(StandardCharsets.UTF_8));
    }
}
