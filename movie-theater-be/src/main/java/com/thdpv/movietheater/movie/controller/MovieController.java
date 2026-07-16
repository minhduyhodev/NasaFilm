package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.request.ActorRequest;
import com.thdpv.movietheater.movie.dto.request.CountryRequest;
import com.thdpv.movietheater.movie.dto.request.CreateMovieRequest;
import com.thdpv.movietheater.movie.dto.request.GenreRequest;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.dto.request.MovieUuidListRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieRequest;
import com.thdpv.movietheater.movie.dto.response.ActorSummaryResponse;
import com.thdpv.movietheater.movie.dto.response.MovieDetailResponse;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.dto.response.MovieMediaResponse;
import com.thdpv.movietheater.movie.dto.response.MovieSummaryResponse;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.service.MovieService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @PostMapping("/admin/movies")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> createMovie(
            @Valid @RequestBody CreateMovieRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieDetailResponse response = movieService.createMovie(request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/movies/{movieUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> updateMovie(
            @PathVariable UUID movieUuid,
            @Valid @RequestBody UpdateMovieRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieDetailResponse response = movieService.updateMovie(movieUuid, request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/movies/{movieUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Void>> deleteMovie(@PathVariable UUID movieUuid) {
        movieService.softDeleteMovie(movieUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa mem phim thanh cong"));
    }

    @GetMapping("/movies")
    public ResponseEntity<ApiResponse<Page<MovieListResponse>>> getMovieList(
            MovieFilterRequest filter,
            @PageableDefault(page = 0, size = 10, sort = "releaseDate", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<MovieListResponse> response = movieService.getMovieList(filter, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/movies/upcoming")
    public ResponseEntity<ApiResponse<Page<MovieListResponse>>> getUpcomingMovies(
            @PageableDefault(page = 0, size = 10, sort = "releaseDate", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<MovieListResponse> response = movieService.getUpcomingMovieList(pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/movies/{movieRef}")
    public ResponseEntity<ApiResponse<MovieDetailResponse>> getMovieDetail(@PathVariable("movieRef") String movieRef) {
        MovieDetailResponse response = movieService.getMovieDetailByRef(movieRef);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/movies/summaries")
    public ResponseEntity<ApiResponse<List<MovieSummaryResponse>>> getMovieSummaries(
            @Valid @RequestBody MovieUuidListRequest request) {
        List<MovieSummaryResponse> response = movieService.getMovieSummaries(request.getUuids());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/admin/movies/{movieUuid}/media")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<MovieMediaResponse>> addMovieMedia(
            @PathVariable UUID movieUuid,
            @Valid @RequestBody MovieMediaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovieMediaResponse response = movieService.addMovieMedia(movieUuid, request,
                userDetails != null ? userDetails.getUsername() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/movies/{movieUuid}/media/{mediaUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
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
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
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
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<ActorSummaryResponse>> createActor(@Valid @RequestBody ActorRequest request) {
        ActorSummaryResponse response = movieService.createActor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/actors/{actorUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<ActorSummaryResponse>> updateActor(
            @PathVariable UUID actorUuid,
            @Valid @RequestBody ActorRequest request) {
        ActorSummaryResponse response = movieService.updateActor(actorUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/actors/{actorUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Void>> deleteActor(@PathVariable UUID actorUuid) {
        movieService.deleteActor(actorUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa dien vien thanh cong"));
    }

    @PostMapping("/admin/genres")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Genre>> createGenre(@Valid @RequestBody GenreRequest request) {
        Genre response = movieService.createGenre(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/genres/{genreUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Genre>> updateGenre(
            @PathVariable UUID genreUuid,
            @Valid @RequestBody GenreRequest request) {
        Genre response = movieService.updateGenre(genreUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/genres/{genreUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Void>> deleteGenre(@PathVariable UUID genreUuid) {
        movieService.deleteGenre(genreUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa the loai thanh cong"));
    }

    @PostMapping("/admin/countries")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Country>> createCountry(@Valid @RequestBody CountryRequest request) {
        Country response = movieService.createCountry(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/admin/countries/{countryUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Country>> updateCountry(
            @PathVariable UUID countryUuid,
            @Valid @RequestBody CountryRequest request) {
        Country response = movieService.updateCountry(countryUuid, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/admin/countries/{countryUuid}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MOVIE_WRITE')")
    public ResponseEntity<ApiResponse<Void>> deleteCountry(@PathVariable UUID countryUuid) {
        movieService.deleteCountry(countryUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Xoa quoc gia thanh cong"));
    }

}
