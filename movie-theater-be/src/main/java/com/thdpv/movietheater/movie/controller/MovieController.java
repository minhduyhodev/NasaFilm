package com.thdpv.movietheater.movie.controller;

import java.util.UUID;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Country;
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
import com.thdpv.movietheater.movie.dto.request.ActorRequest;
import com.thdpv.movietheater.movie.dto.request.CreateMovieRequest;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieRequest;
import com.thdpv.movietheater.movie.dto.response.ActorSummaryResponse;
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
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteMovie(@PathVariable UUID movieUuid) {
        movieService.softDeleteMovie(movieUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa mem phim thanh cong"));
    }

    @GetMapping("/movies")
    public ResponseEntity<ApiResponse<Page<MovieListResponse>>> getMovieList(
            MovieFilterRequest filter,
            @org.springframework.data.web.PageableDefault(
                page = 0,
                size = 10,
                sort = "releaseDate",
                direction = org.springframework.data.domain.Sort.Direction.DESC
            ) Pageable pageable) {
        Page<MovieListResponse> response = movieService.getMovieList(filter, pageable);
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

    @GetMapping("/genres")
    public ResponseEntity<ApiResponse<List<Genre>>> getGenres() {
        return ResponseEntity.ok(ApiResponse.success(movieService.getAllGenres()));
    }

    @GetMapping("/countries")
    public ResponseEntity<ApiResponse<List<Country>>> getCountries() {
        return ResponseEntity.ok(ApiResponse.success(movieService.getAllCountries()));
    }

    @GetMapping("/actors")
    public ResponseEntity<ApiResponse<List<ActorSummaryResponse>>> getActors() {
        return ResponseEntity.ok(ApiResponse.success(movieService.getAllActors()));
    }

    @PostMapping("/admin/actors")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ActorSummaryResponse>> createActor(@Valid @RequestBody ActorRequest request) {
        ActorSummaryResponse response = movieService.createActor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/actors/{actorUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<ActorSummaryResponse>> updateActor(
            @PathVariable UUID actorUuid,
            @Valid @RequestBody ActorRequest request) {
        ActorSummaryResponse response = movieService.updateActor(actorUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/actors/{actorUuid}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteActor(@PathVariable UUID actorUuid) {
        movieService.deleteActor(actorUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa dien vien thanh cong"));
    }

    @GetMapping("/movies/{movieUuid}/stream")
    public ResponseEntity<ApiResponse<String>> getMovieStream(
            @PathVariable UUID movieUuid,
            @AuthenticationPrincipal UserDetails userDetails) {
        String streamUrl = movieService.getMovieStreamUrl(movieUuid, userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(streamUrl));
    }
}
