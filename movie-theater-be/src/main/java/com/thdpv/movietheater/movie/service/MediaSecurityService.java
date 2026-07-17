package com.thdpv.movietheater.movie.service;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.thdpv.movietheater.booking.entity.Booking;
import com.thdpv.movietheater.booking.repository.BookingRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.S3MediaBorderUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MediaSecurityService {

    private final BookingRepository bookingRepository;
    private final MovieRepository movieRepository;

    /**
     * Xác thực token vé VOD khi stream key movie/.
     */
    public void assertVodStreamAllowed(String objectKey, String token) {
        if (objectKey == null || !objectKey.toLowerCase(Locale.ROOT).startsWith("movie/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stream chỉ hỗ trợ key movie/");
        }
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Thiếu token phát trực tuyến");
        }

        Optional<Booking> bookingOpt = bookingRepository
                .findFirstByStreamTokenAndExpiresAtAfter(token.trim(), OffsetDateTime.now());
        if (bookingOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token phát không hợp lệ hoặc đã hết hạn");
        }

        Booking booking = bookingOpt.get();
        if (booking.getMovieUuid() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token phát không hợp lệ");
        }

        Movie movie = movieRepository.findById(booking.getMovieUuid()).orElse(null);
        if (movie == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không tìm thấy phim của vé");
        }

        String resolved = S3MediaBorderUtils.resolveStreamingUrl(movie);
        String expectedKey = S3MediaBorderUtils.extractS3Key(resolved);
        if (expectedKey == null || !expectedKey.equalsIgnoreCase(objectKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token không khớp file phim");
        }
    }
}
