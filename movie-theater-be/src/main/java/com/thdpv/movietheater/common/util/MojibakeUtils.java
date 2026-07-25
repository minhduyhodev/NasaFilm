package com.thdpv.movietheater.common.util;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.regex.Pattern;

/**
 * Phát hiện / sửa chuỗi UTF-8 bị đọc nhầm Latin-1 (mojibake), ví dụ {@code BÃ­ áº©n} → {@code Bí ẩn},
 * hoặc chuỗi có ký tự thay thế {@code \uFFFD} / ASCII {@code ?} (vd. {@code ?m nh?c} → {@code Âm nhạc}).
 */
public final class MojibakeUtils {

    public static final char REPLACEMENT = '\uFFFD';

    private MojibakeUtils() {
    }

    public static boolean hasReplacementChar(String value) {
        return value != null && value.indexOf(REPLACEMENT) >= 0;
    }

    /** ASCII {@code ?} thay thế dấu tiếng Việt (vd. {@code ?m nh?c}). */
    public static boolean hasAsciiQuestionMarks(String value) {
        return value != null && value.indexOf('?') >= 0;
    }

    public static boolean looksLikeMojibake(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return value.contains("Ã") || value.contains("Ä") || value.contains("Æ")
                || value.contains("áº") || value.contains("á»") || value.contains("Â");
    }

    /** Mojibake Latin-1, U+FFFD, hoặc ASCII {@code ?} thay dấu. */
    public static boolean looksCorrupt(String value) {
        return looksLikeMojibake(value) || hasReplacementChar(value) || hasAsciiQuestionMarks(value);
    }

    public static String tryFix(String value) {
        if (value == null) {
            return null;
        }
        if (hasReplacementChar(value) || hasAsciiQuestionMarks(value)) {
            return null;
        }
        // Windows-1252 (không phải ISO-8859-1): giữ được 0x80–0x9F như ‘ ’ “ ” …
        // vốn hay xuất hiện khi UTF-8 bị đọc nhầm trên Windows.
        try {
            String fixed = new String(value.getBytes(Charset.forName("Windows-1252")), StandardCharsets.UTF_8);
            if (looksLikeMojibake(fixed) || hasReplacementChar(fixed) || hasAsciiQuestionMarks(fixed)) {
                // Một số chuỗi bị encode sai 2 lần — thử thêm một vòng.
                String twice = new String(fixed.getBytes(Charset.forName("Windows-1252")), StandardCharsets.UTF_8);
                if (!looksLikeMojibake(twice) && !hasReplacementChar(twice) && !hasAsciiQuestionMarks(twice)) {
                    return twice;
                }
                return null;
            }
            return fixed;
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Ghép tên bị {@code \uFFFD} / ASCII {@code ?} với danh sách tên đúng.
     * Mỗi {@code \uFFFD}, {@code \uFFFD?} hoặc {@code ?} khớp đúng 1 ký tự.
     */
    public static String matchCanonical(String broken, Collection<String> canonicalNames) {
        if (broken == null || broken.isBlank() || canonicalNames == null || canonicalNames.isEmpty()) {
            return null;
        }
        if (!hasReplacementChar(broken) && !hasAsciiQuestionMarks(broken)) {
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
