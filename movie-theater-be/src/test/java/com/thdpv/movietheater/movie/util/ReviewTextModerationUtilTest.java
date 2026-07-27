package com.thdpv.movietheater.movie.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;

class ReviewTextModerationUtilTest {

    @Test
    void blocksDefaultAndCustomWordsCaseInsensitive() {
        List<String> words = List.of("scam", "foobar", "địt");

        assertThrowsBanned("Phim nay la SCAM");
        assertThrowsBanned("FOOBAR qua te");
        assertThrowsBanned("Phim ĐỊT vl");
        assertThrowsBanned("toàn dit thoi");

        assertDoesNotThrow(() -> ReviewTextModerationUtil.assertNoBannedWords(
                "Phim hay, dien xuat tot", words));
    }

    @Test
    void newlyAddedAsciiWordIsEnforced() {
        List<String> words = List.of("scam", "tuxacammoi");

        assertThrows(
                AppException.class,
                () -> ReviewTextModerationUtil.assertNoBannedWords("noi TUXACAMMOI nay", words));
        assertThrows(
                AppException.class,
                () -> ReviewTextModerationUtil.assertNoBannedWords("noi tuxacammoi nay", words));
    }

    private static void assertThrowsBanned(String comment) {
        AppException ex = assertThrows(
                AppException.class,
                () -> ReviewTextModerationUtil.assertNoBannedWords(
                        comment, List.of("scam", "foobar", "địt", "dit")));
        org.junit.jupiter.api.Assertions.assertEquals(ErrorCode.REVIEW_BANNED_WORD, ex.getErrorCode());
    }
}
