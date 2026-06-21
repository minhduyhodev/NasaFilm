package com.thdpv.movietheater.movie.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.booking.entity.Showtime;
import com.thdpv.movietheater.booking.enums.ShowtimeStatus;
import com.thdpv.movietheater.booking.repository.ShowtimeRepository;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.common.exception.AppException;
import com.thdpv.movietheater.common.exception.ErrorCode;
import com.thdpv.movietheater.movie.dto.request.ActorRequest;
import com.thdpv.movietheater.movie.dto.request.CreateMovieRequest;
import com.thdpv.movietheater.movie.dto.request.MovieActorRequest;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieRequest;
import com.thdpv.movietheater.movie.enums.ScreeningMode;
import com.thdpv.movietheater.movie.dto.response.ActorResponse;
import com.thdpv.movietheater.movie.dto.response.ActorSummaryResponse;
import com.thdpv.movietheater.movie.dto.response.MovieDetailResponse;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.dto.response.MovieMediaResponse;
import com.thdpv.movietheater.movie.entity.Actor;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.MovieActor;
import com.thdpv.movietheater.movie.entity.MovieCountry;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.repository.ActorRepository;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.movie.repository.MovieMediaRepository;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.util.MovieStreamingUtils;
import com.thdpv.movietheater.movie.repository.MovieActorRepository;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.config.service.SystemConfigService;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MovieService {

    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;
    private final ActorRepository actorRepository;
    private final MovieMediaRepository movieMediaRepository;
    private final UserRepository userRepository;
    private final MovieActorRepository movieActorRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SystemConfigService systemConfigService;

    @Transactional
    public MovieDetailResponse createMovie(CreateMovieRequest request, String operatorEmail) {
        Movie movie = new Movie();
        applyMovieFields(movie, request.getTitle(), request.getDescription(), request.getDurationMinutes(),
                request.getReleaseDate(), request.getStatus(), request.getAgeRestriction());
        applyStreamingUrl(movie, request.getStreamingUrl(), request.getMedias());
        if (request.getScreeningMode() != null) {
            movie.setScreeningMode(ScreeningMode.valueOf(request.getScreeningMode().toUpperCase()));
        }
        movie.setOnlinePrice(request.getOnlinePrice());
        movie.setRating(request.getRating() != null ? request.getRating() : 8.0);
        replaceGenres(movie, request.getGenreUuids());
        replaceCountries(movie, request.getCountryUuids());
        replaceActors(movie, request.getActors());
        replaceMedias(movie, request.getMedias(), operatorEmail);
        syncStreamingUrlFromMediasIfMissing(movie);
        return toMovieDetailResponse(movieRepository.save(movie));
    }

    @Transactional
    public MovieDetailResponse updateMovie(UUID movieUuid, UpdateMovieRequest request, String operatorEmail) {
        Movie movie = getMovieOrThrow(movieUuid);
        applyMovieFields(movie, request.getTitle(), request.getDescription(), request.getDurationMinutes(),
                request.getReleaseDate(), request.getStatus(), request.getAgeRestriction());
        applyStreamingUrl(movie, request.getStreamingUrl(), request.getMedias());
        if (request.getScreeningMode() != null) {
            movie.setScreeningMode(ScreeningMode.valueOf(request.getScreeningMode().toUpperCase()));
        }
        movie.setOnlinePrice(request.getOnlinePrice());
        if (request.getRating() != null) {
            movie.setRating(request.getRating());
        }

        if (request.getGenreUuids() != null) {
            replaceGenres(movie, request.getGenreUuids());
        }
        if (request.getCountryUuids() != null) {
            replaceCountries(movie, request.getCountryUuids());
        }
        if (request.getActors() != null) {
            replaceActors(movie, request.getActors());
        }
        if (request.getMedias() != null) {
            replaceMedias(movie, request.getMedias(), operatorEmail);
        }

        syncStreamingUrlFromMediasIfMissing(movie);
        return toMovieDetailResponse(movieRepository.save(movie));
    }

    @Transactional
    public void softDeleteMovie(UUID movieUuid) {
        Movie movie = getMovieOrThrow(movieUuid);
        boolean hasShowtime = movieRepository.existsShowtimeByMovieUuid(movieUuid);
        boolean hasBooking = movieRepository.existsBookingByMovieUuid(movieUuid);
        movie.setStatus(hasShowtime || hasBooking ? "INACTIVE" : "DELETED");
        movieRepository.save(movie);
    }

    @Transactional(readOnly = true)
    public Page<MovieListResponse> getMovieList(MovieFilterRequest filter, Pageable pageable) {
        Sort resolvedSort = Sort.unsorted();
        if (pageable.getSort().isSorted()) {
            List<Sort.Order> safeOrders = new ArrayList<>();
            for (Sort.Order order : pageable.getSort()) {
                String resolvedProperty = resolveSortBy(order.getProperty());
                safeOrders.add(new Sort.Order(order.getDirection(), resolvedProperty));
            }
            resolvedSort = Sort.by(safeOrders);
        } else {
            resolvedSort = Sort.by(Sort.Direction.DESC, "releaseDate");
        }

        Pageable safePageable = PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                pageable.getPageSize() > 0 ? pageable.getPageSize() : 10,
                resolvedSort);

        Specification<Movie> specification = (root, query, cb) -> {
            query.distinct(true);
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            predicates.add(cb.not(root.get("status").in("DELETED", "INACTIVE")));

            String keyword = filter.getKeyword();
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)));
            }

            String status = filter.getStatus();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
            }

            List<UUID> genreUuids = filter.getGenreUuids();
            if (genreUuids != null && !genreUuids.isEmpty()) {
                Join<Movie, MovieGenre> movieGenreJoin = root.join("movieGenres", JoinType.LEFT);
                predicates.add(movieGenreJoin.get("genre").get("uuid").in(genreUuids));
            }

            UUID countryUuid = filter.getCountryUuid();
            if (countryUuid != null) {
                Join<Movie, MovieCountry> movieCountryJoin = root.join("movieCountries", JoinType.LEFT);
                predicates.add(cb.equal(movieCountryJoin.get("country").get("uuid"), countryUuid));
            }

            String ageRestriction = filter.getAgeRestriction();
            if (ageRestriction != null && !ageRestriction.isBlank()) {
                predicates.add(cb.equal(root.get("ageRestriction"), ageRestriction.trim()));
            }

            UUID actorUuid = filter.getActorUuid();
            if (actorUuid != null) {
                Join<Movie, MovieActor> movieActorJoin = root.join("movieActors", JoinType.LEFT);
                predicates.add(cb.equal(movieActorJoin.get("actor").get("uuid"), actorUuid));
            }

            UUID cinemaUuid = filter.getCinemaUuid();
            java.time.LocalDate showtimeDate = filter.getShowtimeDate();
            if (cinemaUuid != null || showtimeDate != null) {
                Subquery<UUID> subquery = query.subquery(UUID.class);
                Root<Showtime> stRoot = subquery
                        .from(Showtime.class);
                subquery.select(stRoot.get("movieUuid"));
                List<Predicate> subPredicates = new ArrayList<>();

                if (cinemaUuid != null) {
                    Root<CinemaRoom> roomRoot = subquery
                            .from(CinemaRoom.class);
                    subPredicates.add(cb.equal(stRoot.get("cinemaRoomUuid"), roomRoot.get("uuid")));
                    subPredicates.add(cb.equal(roomRoot.get("cinema").get("uuid"), cinemaUuid));
                }

                if (showtimeDate != null) {
                    OffsetDateTime startOfDay = showtimeDate.atStartOfDay()
                            .atOffset(OffsetDateTime.now().getOffset());
                    OffsetDateTime endOfDay = showtimeDate.plusDays(1).atStartOfDay()
                            .atOffset(OffsetDateTime.now().getOffset());
                    subPredicates.add(cb.greaterThanOrEqualTo(stRoot.get("startTime"), startOfDay));
                    subPredicates.add(cb.lessThan(stRoot.get("startTime"), endOfDay));
                }

                subquery.where(subPredicates.toArray(new Predicate[0]));
                predicates.add(root.get("uuid").in(subquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return movieRepository.findAll(specification, safePageable)
                .map(this::toMovieListResponse);
    }

    @Transactional(readOnly = true)
    public Page<MovieListResponse> getUpcomingMovieList(Pageable pageable) {
        OffsetDateTime now = OffsetDateTime.now();

        Pageable safePageable = PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                pageable.getPageSize() > 0 ? pageable.getPageSize() : 10,
                Sort.by(Sort.Direction.ASC, "releaseDate"));

        Specification<Movie> specification = (root, query, cb) -> {
            query.distinct(true);

            Subquery<UUID> scheduledSubquery = query.subquery(UUID.class);
            Root<Showtime> showtimeRoot = scheduledSubquery.from(Showtime.class);
            scheduledSubquery.select(showtimeRoot.get("movieUuid"));
            scheduledSubquery.where(
                    cb.equal(showtimeRoot.get("status"), ShowtimeStatus.SCHEDULED),
                    cb.greaterThan(showtimeRoot.get("startTime"), now));

            return cb.and(
                    cb.not(root.get("status").in("DELETED", "INACTIVE")),
                    cb.or(
                            cb.equal(root.get("status"), "COMING_SOON"),
                            root.get("uuid").in(scheduledSubquery)));
        };

        List<MovieListResponse> items = movieRepository.findAll(specification).stream()
                .map(movie -> {
                    MovieListResponse response = toMovieListResponse(movie);
                    OffsetDateTime nextStart = showtimeRepository.findEarliestScheduledStart(movie.getUuid(), now);
                    response.setNextShowtimeStart(nextStart);
                    return response;
                })
                .sorted(Comparator
                        .comparing((MovieListResponse m) -> m.getNextShowtimeStart() == null)
                        .thenComparing(MovieListResponse::getNextShowtimeStart,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        int start = (int) safePageable.getOffset();
        int end = Math.min(start + safePageable.getPageSize(), items.size());
        List<MovieListResponse> pageContent = start >= items.size()
                ? List.of()
                : items.subList(start, end);

        return new PageImpl<>(pageContent, safePageable, items.size());
    }

    @Transactional(readOnly = true)
    public MovieDetailResponse getMovieDetail(UUID movieUuid) {
        Movie movie = getMovieOrThrow(movieUuid);
        if ("DELETED".equalsIgnoreCase(movie.getStatus())) {
            throw new AppException(ErrorCode.MOVIE_NOT_FOUND);
        }
        return toMovieDetailResponse(movie);
    }

    @Transactional(readOnly = true)
    public List<Genre> getAllGenres() {
        return genreRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Country> getAllCountries() {
        return countryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ActorSummaryResponse> getAllActors() {
        return actorRepository.findAll().stream()
                .map(this::toActorSummaryResponse)
                .toList();
    }

    @Transactional
    public ActorSummaryResponse createActor(ActorRequest request) {
        String fullName = trim(request.getFullName());
        if (actorRepository.existsByFullNameIgnoreCase(fullName)) {
            throw new AppException(ErrorCode.CONFLICT, "Dien vien da ton tai");
        }

        Actor actor = new Actor();
        actor.setFullName(fullName);
        actor.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        actor.setCountry(resolveCountry(request.getCountryUuid()));
        return toActorSummaryResponse(actorRepository.save(actor));
    }

    @Transactional
    public ActorSummaryResponse updateActor(UUID actorUuid, ActorRequest request) {
        Actor actor = actorRepository.findById(actorUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Dien vien khong ton tai"));

        String fullName = trim(request.getFullName());
        actorRepository.findByFullNameIgnoreCase(fullName)
                .filter(existing -> !existing.getUuid().equals(actorUuid))
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.CONFLICT, "Dien vien da ton tai");
                });

        actor.setFullName(fullName);
        actor.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        actor.setCountry(resolveCountry(request.getCountryUuid()));
        return toActorSummaryResponse(actorRepository.save(actor));
    }

    @Transactional
    public void deleteActor(UUID actorUuid) {
        Actor actor = actorRepository.findById(actorUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Dien vien khong ton tai"));

        if (movieActorRepository.existsByActor_Uuid(actorUuid)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Dien vien dang tham gia phim, khong the xoa");
        }

        actorRepository.delete(actor);
    }

    @Transactional
    public MovieMediaResponse addMovieMedia(UUID movieUuid, MovieMediaRequest request, String operatorEmail) {
        Movie movie = getMovieOrThrow(movieUuid);
        UUID operatorId = resolveOperatorId(operatorEmail);

        if (Boolean.TRUE.equals(request.getIsPrimary())) {
            clearPrimaryFlags(movie);
        }

        MovieMedia movieMedia = toMovieMediaEntity(request, operatorId);
        movie.addMovieMedia(movieMedia);
        movieRepository.save(movie);
        return toMovieMediaResponse(movieMedia);
    }

    @Transactional
    public MovieMediaResponse updateMovieMedia(UUID movieUuid, UUID mediaUuid, MovieMediaRequest request,
            String operatorEmail) {
        MovieMedia movieMedia = movieMediaRepository.findByUuidAndMovie_Uuid(mediaUuid, movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Media phim khong ton tai"));

        if (Boolean.TRUE.equals(request.getIsPrimary())) {
            Movie movie = movieMedia.getMovie();
            clearPrimaryFlags(movie);
        }

        movieMedia.setMediaUrl(trim(request.getMediaUrl()));
        movieMedia.setMediaType(normalizeUpper(request.getMediaType()));
        movieMedia.setTitle(trimToNull(request.getTitle()));
        movieMedia.setIsPrimary(Boolean.TRUE.equals(request.getIsPrimary()));
        movieMedia.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        movieMedia.setUpdatedBy(resolveOperatorId(operatorEmail));

        return toMovieMediaResponse(movieMediaRepository.save(movieMedia));
    }

    @Transactional
    public void deleteMovieMedia(UUID movieUuid, UUID mediaUuid) {
        MovieMedia movieMedia = movieMediaRepository.findByUuidAndMovie_Uuid(mediaUuid, movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Media phim khong ton tai"));
        movieMediaRepository.delete(movieMedia);
    }

    private void applyMovieFields(Movie movie, String title, String description, Integer durationMinutes,
            LocalDate releaseDate, String status, String ageRestriction) {
        movie.setTitle(trim(title));
        movie.setDescription(trimToNull(description));
        movie.setDurationMinutes(durationMinutes);
        movie.setReleaseDate(releaseDate);
        movie.setStatus(normalizeUpper(status));
        movie.setAgeRestriction(trim(ageRestriction));
    }

    private void replaceGenres(Movie movie, List<UUID> genreUuids) {
        if (genreUuids == null) {
            genreUuids = new ArrayList<>();
        }
        validateNoDuplicateUuids(genreUuids, "Genre bi trung");

        List<MovieGenre> toRemove = new ArrayList<>();
        for (MovieGenre mg : movie.getMovieGenres()) {
            if (!genreUuids.contains(mg.getGenre().getUuid())) {
                toRemove.add(mg);
            }
        }
        for (MovieGenre mg : toRemove) {
            movie.getMovieGenres().remove(mg);
            mg.setMovie(null);
        }

        Set<UUID> currentGenreUuids = movie.getMovieGenres().stream()
                .map(mg -> mg.getGenre().getUuid())
                .collect(Collectors.toSet());

        List<UUID> toAddUuids = new ArrayList<>();
        for (UUID uuid : genreUuids) {
            if (!currentGenreUuids.contains(uuid)) {
                toAddUuids.add(uuid);
            }
        }

        if (!toAddUuids.isEmpty()) {
            List<Genre> genres = genreRepository.findAllById(toAddUuids);
            if (genres.size() != toAddUuids.size()) {
                throw new AppException(ErrorCode.NOT_FOUND, "Genre khong ton tai");
            }
            for (Genre genre : genres) {
                MovieGenre movieGenre = new MovieGenre();
                movieGenre.setGenre(genre);
                movie.addMovieGenre(movieGenre);
            }
        }
    }

    private void replaceCountries(Movie movie, List<UUID> countryUuids) {
        if (countryUuids == null) {
            countryUuids = new java.util.ArrayList<>();
        }
        validateNoDuplicateUuids(countryUuids, "Country bi trung");

        List<MovieCountry> toRemove = new java.util.ArrayList<>();
        for (MovieCountry mc : movie.getMovieCountries()) {
            if (!countryUuids.contains(mc.getCountry().getUuid())) {
                toRemove.add(mc);
            }
        }
        for (MovieCountry mc : toRemove) {
            movie.getMovieCountries().remove(mc);
            mc.setMovie(null);
        }

        Set<UUID> currentCountryUuids = movie.getMovieCountries().stream()
                .map(mc -> mc.getCountry().getUuid())
                .collect(Collectors.toSet());

        List<UUID> toAddUuids = new java.util.ArrayList<>();
        for (UUID uuid : countryUuids) {
            if (!currentCountryUuids.contains(uuid)) {
                toAddUuids.add(uuid);
            }
        }

        if (!toAddUuids.isEmpty()) {
            List<Country> countries = countryRepository.findAllById(toAddUuids);
            if (countries.size() != toAddUuids.size()) {
                throw new AppException(ErrorCode.NOT_FOUND, "Country khong ton tai");
            }
            for (Country country : countries) {
                MovieCountry movieCountry = new MovieCountry();
                movieCountry.setCountry(country);
                movie.addMovieCountry(movieCountry);
            }
        }
    }

    private void replaceMedias(Movie movie, List<MovieMediaRequest> medias, String operatorEmail) {
        movie.getMovieMedias().clear();
        if (medias == null || medias.isEmpty()) {
            return;
        }

        validatePrimaryMedia(medias);
        UUID operatorId = resolveOperatorId(operatorEmail);
        for (MovieMediaRequest mediaRequest : medias) {
            movie.addMovieMedia(toMovieMediaEntity(mediaRequest, operatorId));
        }
    }

    private void replaceActors(Movie movie, List<MovieActorRequest> actorRequests) {
        movie.getMovieActors().clear();
        if (actorRequests == null || actorRequests.isEmpty()) {
            return;
        }

        validateNoDuplicateUuids(actorRequests.stream()
                .map(MovieActorRequest::getActorUuid)
                .toList(), "Actor bi trung");

        List<UUID> actorUuids = actorRequests.stream()
                .map(MovieActorRequest::getActorUuid)
                .toList();
        List<Actor> actors = actorRepository.findAllById(actorUuids);
        if (actors.size() != actorUuids.size()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Dien vien khong ton tai");
        }

        java.util.Map<UUID, Actor> actorMap = actors.stream()
                .collect(Collectors.toMap(Actor::getUuid, actor -> actor));

        for (MovieActorRequest request : actorRequests) {
            MovieActor movieActor = new MovieActor();
            movieActor.setActor(actorMap.get(request.getActorUuid()));
            movieActor.setCharacterName(trimToNull(request.getCharacterName()));
            movieActor.setCastOrder(request.getCastOrder() != null ? request.getCastOrder() : 0);
            movieActor.setIsMain(Boolean.TRUE.equals(request.getIsMain()));
            movie.addMovieActor(movieActor);
        }
    }

    private MovieMedia toMovieMediaEntity(MovieMediaRequest request, UUID operatorId) {
        MovieMedia movieMedia = new MovieMedia();
        movieMedia.setMediaUrl(trim(request.getMediaUrl()));
        movieMedia.setMediaType(normalizeUpper(request.getMediaType()));
        movieMedia.setTitle(trimToNull(request.getTitle()));
        movieMedia.setIsPrimary(Boolean.TRUE.equals(request.getIsPrimary()));
        movieMedia.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        movieMedia.setCreatedBy(operatorId);
        movieMedia.setUpdatedBy(operatorId);
        return movieMedia;
    }

    private void clearPrimaryFlags(Movie movie) {
        for (MovieMedia media : movie.getMovieMedias()) {
            media.setIsPrimary(Boolean.FALSE);
        }
    }

    private void validatePrimaryMedia(List<MovieMediaRequest> medias) {
        long primaryCount = medias.stream()
                .filter(Objects::nonNull)
                .filter(media -> Boolean.TRUE.equals(media.getIsPrimary()))
                .count();
        if (primaryCount > 1) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Chi duoc co mot media chinh");
        }
    }

    private void validateNoDuplicateUuids(List<UUID> uuids, String message) {
        Set<UUID> uniqueValues = new HashSet<>(uuids);
        if (uniqueValues.size() != uuids.size()) {
            throw new AppException(ErrorCode.BAD_REQUEST, message);
        }
    }

    private MovieListResponse toMovieListResponse(Movie movie) {
        MovieListResponse response = new MovieListResponse(
                movie.getUuid(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getDurationMinutes(),
                movie.getReleaseDate(),
                movie.getStatus(),
                movie.getAgeRestriction(),
                resolvePrimaryMediaUrl(movie),
                movie.getMovieGenres().stream()
                        .map(movieGenre -> movieGenre.getGenre().getName())
                        .toList(),
                movie.getMovieCountries().stream()
                        .map(movieCountry -> movieCountry.getCountry().getName())
                        .toList(),
                MovieStreamingUtils.resolveStreamingUrl(movie),
                movie.getCreatedAt(),
                movie.getUpdatedAt());
        response.setScreeningMode(movie.getScreeningMode() != null ? movie.getScreeningMode().name() : null);
        response.setOnlinePrice(resolveOnlinePrice(movie));
        response.setRating(movie.getRating() != null ? movie.getRating() : 8.0);
        return response;
    }

    private MovieDetailResponse toMovieDetailResponse(Movie movie) {
        MovieDetailResponse response = new MovieDetailResponse(
                movie.getUuid(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getDurationMinutes(),
                movie.getReleaseDate(),
                movie.getStatus(),
                movie.getAgeRestriction(),
                movie.getMovieGenres().stream()
                        .map(movieGenre -> movieGenre.getGenre().getName())
                        .toList(),
                movie.getMovieCountries().stream()
                        .map(movieCountry -> movieCountry.getCountry().getName())
                        .toList(),
                movie.getMovieActors().stream()
                        .map(this::toActorResponse)
                        .toList(),
                movie.getMovieMedias().stream()
                        .sorted((left, right) -> Integer.compare(
                                left.getSortOrder() != null ? left.getSortOrder() : 0,
                                right.getSortOrder() != null ? right.getSortOrder() : 0))
                        .map(this::toMovieMediaResponse)
                        .collect(Collectors.toList()),
                MovieStreamingUtils.resolveStreamingUrl(movie),
                movie.getCreatedAt(),
                movie.getUpdatedAt());
        response.setScreeningMode(movie.getScreeningMode() != null ? movie.getScreeningMode().name() : null);
        response.setOnlinePrice(resolveOnlinePrice(movie));
        response.setRating(movie.getRating() != null ? movie.getRating() : 8.0);
        return response;
    }

    private ActorResponse toActorResponse(MovieActor movieActor) {
        String countryName = null;
        if (movieActor.getActor() != null && movieActor.getActor().getCountry() != null) {
            countryName = movieActor.getActor().getCountry().getName();
        }
        return new ActorResponse(
                movieActor.getActor() != null ? movieActor.getActor().getUuid() : null,
                movieActor.getActor() != null ? movieActor.getActor().getFullName() : null,
                movieActor.getActor() != null ? movieActor.getActor().getAvatarUrl() : null,
                countryName,
                movieActor.getCharacterName(),
                movieActor.getCastOrder(),
                movieActor.getIsMain());
    }

    private ActorSummaryResponse toActorSummaryResponse(Actor actor) {
        UUID countryUuid = null;
        String countryName = null;
        if (actor.getCountry() != null) {
            countryUuid = actor.getCountry().getUuid();
            countryName = actor.getCountry().getName();
        }
        return new ActorSummaryResponse(
                actor.getUuid(),
                actor.getFullName(),
                actor.getAvatarUrl(),
                countryUuid,
                countryName);
    }

    private MovieMediaResponse toMovieMediaResponse(MovieMedia movieMedia) {
        return new MovieMediaResponse(
                movieMedia.getUuid(),
                movieMedia.getMediaUrl(),
                movieMedia.getMediaType(),
                movieMedia.getTitle(),
                movieMedia.getIsPrimary(),
                movieMedia.getSortOrder(),
                movieMedia.getCreatedAt(),
                movieMedia.getUpdatedAt());
    }

    private String resolvePrimaryMediaUrl(Movie movie) {
        for (MovieMedia movieMedia : movie.getMovieMedias()) {
            if (Boolean.TRUE.equals(movieMedia.getIsPrimary())) {
                return movieMedia.getMediaUrl();
            }
        }
        return movie.getMovieMedias().stream()
                .findFirst()
                .map(MovieMedia::getMediaUrl)
                .orElse(null);
    }

    private Movie getMovieOrThrow(UUID movieUuid) {
        return movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
    }

    private UUID resolveOperatorId(String operatorEmail) {
        if (operatorEmail == null || operatorEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(operatorEmail)
                .map(User::getId)
                .orElse(null);
    }

    private Country resolveCountry(UUID countryUuid) {
        if (countryUuid == null) {
            return null;
        }
        return countryRepository.findById(countryUuid)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Country khong ton tai"));
    }

    private String resolveSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "releaseDate";
        }
        return switch (sortBy) {
            case "title" -> "title";
            case "createdAt" -> "createdAt";
            case "updatedAt" -> "updatedAt";
            case "durationMinutes" -> "durationMinutes";
            case "status" -> "status";
            default -> "releaseDate";
        };
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private String normalizeUpper(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    @Transactional(readOnly = true)
    public String getMovieStreamUrl(UUID movieUuid, String email) {
        if (email == null || email.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        Movie movie = movieRepository.findById(movieUuid)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));

        String streamingUrl = MovieStreamingUtils.resolveStreamingUrl(movie);
        if (streamingUrl == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Phim không hỗ trợ xem trực tuyến");
        }

        boolean isVip = user.getScore() != null && user.getScore() >= 10000;
        boolean hasTicket = movieRepository.hasConfirmedBookingForMovie(user.getId(), movieUuid);

        if (!isVip && !hasTicket) {
            throw new AppException(ErrorCode.FORBIDDEN, "Yêu cầu khách hàng mua vé phim hoặc nâng cấp VIP");
        }

        return streamingUrl;
    }

    private void applyStreamingUrl(Movie movie, String streamingUrl, List<MovieMediaRequest> medias) {
        String resolved = trimToNull(streamingUrl);
        if (resolved == null) {
            resolved = MovieStreamingUtils.resolveFromMediaRequests(medias);
        }
        movie.setStreamingUrl(resolved);
    }

    private void syncStreamingUrlFromMediasIfMissing(Movie movie) {
        if (trimToNull(movie.getStreamingUrl()) != null) {
            return;
        }
        movie.setStreamingUrl(MovieStreamingUtils.resolveStreamingUrl(movie));
    }

    private BigDecimal resolveOnlinePrice(Movie movie) {
        if (movie.getOnlinePrice() != null) {
            return movie.getOnlinePrice();
        }
        ScreeningMode mode = movie.getScreeningMode();
        if (mode == ScreeningMode.ONLINE_ONLY || mode == ScreeningMode.BOTH) {
            return systemConfigService.getDefaultOnlinePrice();
        }
        return null;
    }
}
