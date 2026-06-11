package com.thdpv.movietheater.movie.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.request.CreateMovieRequest;
import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieRequest;
import com.thdpv.movietheater.movie.dto.response.MovieDetailResponse;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.dto.response.MovieMediaResponse;
import com.thdpv.movietheater.movie.service.MovieService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @PostMapping("/admin/movies")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> createMovie(
            @Valid @RequestBody CreateMovieRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieDetailResponse response = movieService.createMovie(request, userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/movies/{movieUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> updateMovie(
            @PathVariable UUID movieUuid,
            @Valid @RequestBody UpdateMovieRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieDetailResponse response = movieService.updateMovie(movieUuid, request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/movies/{movieUuid}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteMovie(@PathVariable UUID movieUuid) {
        movieService.softDeleteMovie(movieUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa mem phim thanh cong"));
    }

    @GetMapping("/movies")
    public ResponseEntity<ApiResponse<Page<MovieListResponse>>> getMovieList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID genreUuid,
            @RequestParam(required = false) UUID countryUuid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "releaseDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Page<MovieListResponse> response = movieService.getMovieList(
                keyword, status, genreUuid, countryUuid, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/movies/{movieUuid}")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> getMovieDetail(@PathVariable UUID movieUuid) {
        MovieDetailResponse response = movieService.getMovieDetail(movieUuid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/admin/movies/{movieUuid}/media")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<MovieMediaResponse>> addMovieMedia(
            @PathVariable UUID movieUuid,
            @Valid @RequestBody MovieMediaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieMediaResponse response = movieService.addMovieMedia(movieUuid, request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/movies/{movieUuid}/media/{mediaUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<MovieMediaResponse>> updateMovieMedia(
            @PathVariable UUID movieUuid,
            @PathVariable UUID mediaUuid,
            @Valid @RequestBody MovieMediaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieMediaResponse response = movieService.updateMovieMedia(movieUuid, mediaUuid, request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/movies/{movieUuid}/media/{mediaUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteMovieMedia(
            @PathVariable UUID movieUuid,
            @PathVariable UUID mediaUuid) {
        movieService.deleteMovieMedia(movieUuid, mediaUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa media phim thanh cong"));
    }
}
