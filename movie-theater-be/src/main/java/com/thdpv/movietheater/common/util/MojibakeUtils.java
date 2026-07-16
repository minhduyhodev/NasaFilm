package com.thdpv.movietheater.common.util;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.regex.Pattern;

/**
 * Phát hiện / sửa chuỗi UTF-8 bị đọc nhầm Latin-1 (mojibake), ví dụ {@code BÃ­ áº©n} → {@code Bí ẩn},
 * hoặc chuỗi có ký tự thay thế {@code \uFFFD} (thường hiện thành {@code �}).
 */
public final class MojibakeUtils {

    public static final char REPLACEMENT = '\uFFFD';

    private MojibakeUtils() {
    }

    public static boolean hasReplacementChar(String value) {
        return value != null && value.indexOf(REPLACEMENT) >= 0;
    }

    public static boolean looksLikeMojibake(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return value.contains("Ã") || value.contains("Ä") || value.contains("Æ")
                || value.contains("áº") || value.contains("á»") || value.contains("Â");
    }

    /** Mojibake Latin-1 hoặc đã mất ký tự (U+FFFD). */
    public static boolean looksCorrupt(String value) {
        return looksLikeMojibake(value) || hasReplacementChar(value);
    }

    public static String tryFix(String value) {
        if (value == null) {
            return null;
        }
        if (hasReplacementChar(value)) {
            return null;
        }
        try {
            String fixed = new String(value.getBytes(Charset.forName("ISO-8859-1")), StandardCharsets.UTF_8);
            if (looksLikeMojibake(fixed) || hasReplacementChar(fixed)) {
                return null;
            }
            return fixed;
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Ghép tên bị {@code \uFFFD} (và {@code ?} thừa sau nó) với danh sách tên đúng.
     * Mỗi cụm {@code \uFFFD} hoặc {@code \uFFFD?} khớp đúng 1 ký tự.
     */
    public static String matchCanonical(String broken, Collection<String> canonicalNames) {
        if (broken == null || broken.isBlank() || canonicalNames == null || canonicalNames.isEmpty()) {
            return null;
        }
        if (!hasReplacementChar(broken)) {
            return null;
        }
        StringBuilder regex = new StringBuilder("^");
        for (int i = 0; i < broken.length(); i++) {
            char c = broken.charAt(i);
            if (c == REPLACEMENT) {
                regex.append('.');
                if (i + 1 < broken.length() && broken.charAt(i + 1) == '?') {
                    i++; // bỏ ? thừa sau U+FFFD
                }
            } else if (c == '?') {
                regex.append('.');
            } else {
                regex.append(Pattern.quote(String.valueOf(c)));
            }
        }
        regex.append('$');
        Pattern pattern = Pattern.compile(regex.toString());
        String match = null;
        for (String candidate : canonicalNames) {
            if (candidate == null || looksCorrupt(candidate)) {
                continue;
            }
            if (pattern.matcher(candidate).matches()) {
                if (match != null && !match.equalsIgnoreCase(candidate)) {
                    return null; // ambiguous
                }
                match = candidate;
            }
        }
        return match;
    }
}
