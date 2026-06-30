package com.thdpv.movietheater.movie.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.movie.dto.response.FavoriteMovieResponse;
import com.thdpv.movietheater.movie.service.FavoriteService;

@RestController
@RequestMapping("/api/favorites")
@PreAuthorize("isAuthenticated()")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FavoriteMovieResponse>>> listFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                favoriteService.listFavorites(userDetails.getUsername())));
    }

    @GetMapping("/{movieUuid}/status")
    public ResponseEntity<ApiResponse<Boolean>> isFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID movieUuid) {
        return ResponseEntity.ok(ApiResponse.success(
                favoriteService.isFavorite(userDetails.getUsername(), movieUuid)));
    }

    @PostMapping("/{movieUuid}")
    public ResponseEntity<ApiResponse<Void>> addFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID movieUuid) {
        favoriteService.addFavorite(userDetails.getUsername(), movieUuid);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(null));
    }

    @DeleteMapping("/{movieUuid}")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID movieUuid) {
        favoriteService.removeFavorite(userDetails.getUsername(), movieUuid);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã bỏ lưu phim"));
    }
}
