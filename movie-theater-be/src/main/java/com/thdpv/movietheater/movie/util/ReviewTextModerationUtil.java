package com.thdpv.movietheater.movie.util;

import java.util.List;
import java.util.regex.Pattern;

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
        if (normalized == null) {
            return;
        }
        String lowered = normalized.toLowerCase();
        for (String bannedWord : bannedWords) {
            if (bannedWord == null || bannedWord.isBlank()) {
                continue;
            }
            String token = bannedWord.trim().toLowerCase();
            if (token.contains(" ")) {
                if (lowered.contains(token)) {
                    throwBannedWord();
                }
            } else if (matchesWholeWord(lowered, token)) {
                throwBannedWord();
            }
        }
    }

    private static boolean matchesWholeWord(String text, String word) {
        Pattern pattern = Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(word) + "(?![\\p{L}\\p{N}])");
        return pattern.matcher(text).find();
    }

    private static void throwBannedWord() {
        throw new com.thdpv.movietheater.common.exception.AppException(
                com.thdpv.movietheater.common.exception.ErrorCode.REVIEW_BANNED_WORD);
    }
}
