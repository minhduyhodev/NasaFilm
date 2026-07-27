package com.thdpv.movietheater.movie.util;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

public final class ReviewTextModerationUtil {

    private ReviewTextModerationUtil() {
    }

    public static String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String collapsed = comment.trim().replaceAll("\\s+", " ");
        return collapsed.isEmpty() ? null : collapsed;
    }

    public static void assertNoBannedWords(String comment, List<String> bannedWords) {
        String normalized = normalizeComment(comment);
        if (normalized == null || bannedWords == null || bannedWords.isEmpty()) {
            return;
        }

        String lowered = foldCase(normalized);
        String ascii = stripDiacritics(lowered);

        for (String bannedWord : bannedWords) {
            if (bannedWord == null || bannedWord.isBlank()) {
                continue;
            }
            String token = foldCase(bannedWord.trim());
            if (token.isEmpty()) {
                continue;
            }
            String asciiToken = stripDiacritics(token);
            if (containsBannedToken(lowered, token) || containsBannedToken(ascii, asciiToken)) {
                throwBannedWord();
            }
        }
    }

    private static boolean containsBannedToken(String haystack, String token) {
        if (haystack == null || token == null || token.isBlank()) {
            return false;
        }
        if (token.contains(" ")) {
            return haystack.contains(token);
        }
        return matchesWholeWord(haystack, token);
    }

    private static boolean matchesWholeWord(String text, String word) {
        Pattern pattern = Pattern.compile(
                "(?<![\\p{L}\\p{N}])" + Pattern.quote(word) + "(?![\\p{L}\\p{N}])",
                Pattern.UNICODE_CASE);
        return pattern.matcher(text).find();
    }

    /** Locale-stable lowercasing so IN HOA / i Turkish-dot never bypass filters. */
    static String foldCase(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT);
    }

    /**
     * Fold Vietnamese (and other) diacritics so "ĐỊT" / "dit" / "địt" share one form.
     * Explicitly maps đ/Đ → d because NFD does not decompose the stroke letter.
     */
    static String stripDiacritics(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String folded = foldCase(text)
                .replace('đ', 'd')
                .replace('Đ', 'd');
        return Normalizer.normalize(folded, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static void throwBannedWord() {
        throw new AppException(ErrorCode.REVIEW_BANNED_WORD);
    }
}
