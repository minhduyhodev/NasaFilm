package com.thdpv.movietheater.discover.support;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.thdpv.movietheater.discover.dto.request.DiscoverMatchRequest;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.enums.ScreeningMode;
import com.thdpv.movietheater.radar.support.ShowtimeRadarGenreMatcher;

public final class DiscoverScorer {

    private DiscoverScorer() {
    }

    public record ScoreResult(int score, List<String> reasons) {
    }

    public static ScoreResult score(
            MovieListResponse movie,
            DiscoverMatchRequest request,
            Map<UUID, String> genreNamesByUuid,
            Set<UUID> favoriteGenreUuids) {
        int score = 0;
        List<String> reasons = new ArrayList<>();

        score += scoreMood(movie, request.getMood(), genreNamesByUuid, reasons);
        score += scoreDuration(movie, request.getDuration(), reasons);
        score += scoreViewingLocation(movie, request.getViewingLocation(), reasons);
        score += scoreSelectedGenres(movie, request.getGenreUuids(), genreNamesByUuid, reasons);
        score += scoreHistory(movie, request.getUseHistory(), favoriteGenreUuids, genreNamesByUuid, reasons);
        score += scoreRating(movie, reasons);
        score += scoreFreshRelease(movie, reasons);

        return new ScoreResult(score, reasons);
    }

    private static int scoreMood(
            MovieListResponse movie,
            String mood,
            Map<UUID, String> genreNamesByUuid,
            List<String> reasons) {
        if (mood == null || mood.isBlank()) {
            return 0;
        }
        List<UUID> moodGenres = moodGenreUuids(mood, genreNamesByUuid);
        if (moodGenres.isEmpty()) {
            return 0;
        }
        Set<UUID> movieGenreUuids = resolveMovieGenreUuids(movie.getGenres(), genreNamesByUuid);
        if (ShowtimeRadarGenreMatcher.matches(moodGenres, movieGenreUuids, genreNamesByUuid)) {
            reasons.add(moodReason(mood));
            return 25;
        }
        return 0;
    }

    private static int scoreDuration(MovieListResponse movie, String durationPref, List<String> reasons) {
        Integer mins = movie.getDurationMinutes();
        if (mins == null || mins <= 0 || durationPref == null) {
            return 0;
        }
        String normalized = durationPref.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "SHORT" -> {
                if (mins <= 100) {
                    reasons.add("Thời lượng ngắn gọn (~" + mins + " phút)");
                    yield 20;
                }
                yield 0;
            }
            case "MEDIUM" -> {
                if (mins >= 95 && mins <= 135) {
                    reasons.add("Thời lượng vừa phải (~" + mins + " phút)");
                    yield 20;
                }
                yield 0;
            }
            case "LONG" -> {
                if (mins >= 120) {
                    reasons.add("Phim dài, trải nghiệm trọn vẹn (~" + mins + " phút)");
                    yield 20;
                }
                yield 0;
            }
            default -> 0;
        };
    }

    private static int scoreViewingLocation(MovieListResponse movie, String location, List<String> reasons) {
        if (location == null || location.isBlank()) {
            return 0;
        }
        String mode = movie.getScreeningMode();
        String normalized = location.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "THEATER" -> {
                if (ScreeningMode.THEATER_ONLY.name().equals(mode) || ScreeningMode.BOTH.name().equals(mode)) {
                    reasons.add("Phù hợp xem tại rạp");
                    yield 20;
                }
                yield 0;
            }
            case "HOME" -> {
                if (ScreeningMode.ONLINE_ONLY.name().equals(mode) || ScreeningMode.BOTH.name().equals(mode)) {
                    reasons.add("Có thể xem online tại nhà");
                    yield 20;
                }
                yield 0;
            }
            case "BOTH" -> {
                if (ScreeningMode.BOTH.name().equals(mode)) {
                    reasons.add("Xem được cả rạp lẫn VOD");
                    yield 15;
                }
                yield 0;
            }
            default -> 0;
        };
    }

    private static int scoreSelectedGenres(
            MovieListResponse movie,
            List<UUID> selectedGenreUuids,
            Map<UUID, String> genreNamesByUuid,
            List<String> reasons) {
        if (selectedGenreUuids == null || selectedGenreUuids.isEmpty()) {
            return 0;
        }
        Set<UUID> movieGenreUuids = resolveMovieGenreUuids(movie.getGenres(), genreNamesByUuid);
        if (ShowtimeRadarGenreMatcher.matches(selectedGenreUuids, movieGenreUuids, genreNamesByUuid)) {
            String genreLabel = selectedGenreUuids.stream()
                    .map(genreNamesByUuid::get)
                    .filter(name -> name != null && !name.isBlank())
                    .findFirst()
                    .orElse("thể loại yêu thích");
            reasons.add("Khớp thể loại " + genreLabel);
            return 30;
        }
        return 0;
    }

    private static int scoreHistory(
            MovieListResponse movie,
            Boolean useHistory,
            Set<UUID> favoriteGenreUuids,
            Map<UUID, String> genreNamesByUuid,
            List<String> reasons) {
        if (!Boolean.TRUE.equals(useHistory) || favoriteGenreUuids == null || favoriteGenreUuids.isEmpty()) {
            return 0;
        }
        Set<UUID> movieGenreUuids = resolveMovieGenreUuids(movie.getGenres(), genreNamesByUuid);
        if (ShowtimeRadarGenreMatcher.matches(new ArrayList<>(favoriteGenreUuids), movieGenreUuids, genreNamesByUuid)) {
            reasons.add("Gần với gu phim bạn đã lưu");
            return 20;
        }
        return 0;
    }

    private static int scoreRating(MovieListResponse movie, List<String> reasons) {
        Double rating = movie.getReviewAverageRating() != null
                ? movie.getReviewAverageRating()
                : movie.getRating();
        if (rating == null || rating < 4.0) {
            return 0;
        }
        reasons.add(String.format(Locale.ROOT, "Được đánh giá %.1f/5", rating));
        return (int) Math.round((rating - 3.5) * 8);
    }

    private static int scoreFreshRelease(MovieListResponse movie, List<String> reasons) {
        if (movie.getReleaseDate() == null) {
            return 0;
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(movie.getReleaseDate(), java.time.LocalDate.now());
        if (days >= 0 && days <= 21) {
            reasons.add("Phim mới ra mắt");
            return 10;
        }
        return 0;
    }

    private static List<UUID> moodGenreUuids(String mood, Map<UUID, String> genreNamesByUuid) {
        List<String> keywords = switch (mood.trim().toUpperCase(Locale.ROOT)) {
            case "RELAX" -> List.of("hài", "hoạt hình", "gia đình", "trẻ em", "âm nhạc");
            case "EXCITING" -> List.of("hành động", "phiêu lưu", "viễn tưởng", "khoa học viễn tưởng", "siêu anh hùng");
            case "EMOTIONAL" -> List.of("tình cảm", "lãng mạn", "chính kịch", "tâm lý", "tiểu sử");
            case "THRILLING" -> List.of("kinh dị", "gay cấn", "bí ẩn", "hình sự", "tội phạm");
            default -> List.of();
        };
        return genreNamesByUuid.entrySet().stream()
                .filter(entry -> keywords.stream()
                        .map(DiscoverScorer::normalize)
                        .anyMatch(keyword -> normalize(entry.getValue()).contains(keyword)))
                .map(Map.Entry::getKey)
                .toList();
    }

    private static String moodReason(String mood) {
        return switch (mood.trim().toUpperCase(Locale.ROOT)) {
            case "RELAX" -> "Phù hợp tâm trạng thư giãn";
            case "EXCITING" -> "Đủ kịch tính, cuốn hút";
            case "EMOTIONAL" -> "Chạm cảm xúc, sâu lắng";
            case "THRILLING" -> "Hồi hộp, kịch tính";
            default -> "Khớp tâm trạng của bạn";
        };
    }

    private static Set<UUID> resolveMovieGenreUuids(List<String> genreNames, Map<UUID, String> genreNamesByUuid) {
        if (genreNames == null || genreNames.isEmpty()) {
            return Set.of();
        }
        return genreNamesByUuid.entrySet().stream()
                .filter(entry -> genreNames.stream().anyMatch(name -> normalize(name).equals(normalize(entry.getValue()))))
                .map(Map.Entry::getKey)
                .collect(java.util.stream.Collectors.toSet());
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
