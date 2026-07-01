package com.thdpv.movietheater.movie.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.dto.response.FavoriteMovieResponse;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserFavorite;
import com.thdpv.movietheater.user.repository.UserFavoriteRepository;
import com.thdpv.movietheater.user.repository.UserRepository;

@Service
public class FavoriteService {

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;

    public FavoriteService(
            UserFavoriteRepository userFavoriteRepository,
            UserRepository userRepository,
            MovieRepository movieRepository) {
        this.userFavoriteRepository = userFavoriteRepository;
        this.userRepository = userRepository;
        this.movieRepository = movieRepository;
    }

    @Transactional(readOnly = true)
    public List<FavoriteMovieResponse> listFavorites(String userEmail) {
        UUID userUuid = resolveUserUuid(userEmail);
        List<UserFavorite> favorites = userFavoriteRepository.findByUserUuidOrderByCreatedAtDesc(userUuid);
        if (favorites.isEmpty()) {
            return List.of();
        }
        List<UUID> movieUuids = favorites.stream().map(UserFavorite::getMovieUuid).toList();
        Map<UUID, Movie> moviesWithMedias = movieRepository.findAllByIdWithMedias(movieUuids).stream()
                .collect(Collectors.toMap(Movie::getUuid, movie -> movie));
        Map<UUID, Movie> moviesWithGenres = movieRepository.findAllByIdWithGenres(movieUuids).stream()
                .collect(Collectors.toMap(Movie::getUuid, movie -> movie));

        return favorites.stream()
                .map(fav -> {
                    Movie movie = moviesWithMedias.get(fav.getMovieUuid());
                    Movie movieWithGenres = moviesWithGenres.get(fav.getMovieUuid());
                    FavoriteMovieResponse response = new FavoriteMovieResponse();
                    response.setMovieUuid(fav.getMovieUuid());
                    response.setFavoritedAt(fav.getCreatedAt());
                    if (movie != null) {
                        response.setTitle(movie.getTitle());
                        response.setAgeRestriction(movie.getAgeRestriction());
                        response.setPrimaryMediaUrl(extractPosterUrl(movie));
                    }
                    response.setGenreUuids(extractGenreUuids(movieWithGenres));
                    return response;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(String userEmail, UUID movieUuid) {
        UUID userUuid = resolveUserUuid(userEmail);
        return userFavoriteRepository.existsByUserUuidAndMovieUuid(userUuid, movieUuid);
    }

    @Transactional
    public void addFavorite(String userEmail, UUID movieUuid) {
        UUID userUuid = resolveUserUuid(userEmail);
        movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy phim"));

        if (userFavoriteRepository.existsByUserUuidAndMovieUuid(userUuid, movieUuid)) {
            return;
        }

        UserFavorite favorite = new UserFavorite();
        favorite.setUuid(UUID.randomUUID());
        favorite.setUserUuid(userUuid);
        favorite.setMovieUuid(movieUuid);
        favorite.setCreatedAt(OffsetDateTime.now());
        userFavoriteRepository.save(favorite);
    }

    @Transactional
    public void removeFavorite(String userEmail, UUID movieUuid) {
        UUID userUuid = resolveUserUuid(userEmail);
        userFavoriteRepository.deleteByUserUuidAndMovieUuid(userUuid, movieUuid);
    }

    private UUID resolveUserUuid(String userEmail) {
        return userRepository.findByEmailIgnoreCase(userEmail)
                .map(User::getId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Người dùng chưa đăng nhập"));
    }

    private String extractPosterUrl(Movie movie) {
        if (movie.getMovieMedias() == null || movie.getMovieMedias().isEmpty()) {
            return null;
        }
        return movie.getMovieMedias().stream()
                .filter(media -> Boolean.TRUE.equals(media.getIsPrimary()))
                .map(media -> media.getMediaUrl())
                .findFirst()
                .orElse(movie.getMovieMedias().get(0).getMediaUrl());
    }

    private List<UUID> extractGenreUuids(Movie movie) {
        if (movie == null || movie.getMovieGenres() == null) {
            return List.of();
        }
        return movie.getMovieGenres().stream()
                .map(MovieGenre::getGenre)
                .filter(genre -> genre != null && genre.getUuid() != null)
                .map(Genre::getUuid)
                .distinct()
                .toList();
    }
}
