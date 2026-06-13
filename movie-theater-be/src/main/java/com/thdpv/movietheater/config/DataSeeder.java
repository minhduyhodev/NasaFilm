package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.User;
import com.thdpv.movietheater.user.entity.UserRole;
import com.thdpv.movietheater.user.enums.AuthProvider;
import com.thdpv.movietheater.user.enums.RoleName;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.movie.entity.Movie;
import com.thdpv.movietheater.movie.entity.Genre;
import com.thdpv.movietheater.movie.entity.Country;
import com.thdpv.movietheater.movie.entity.MovieGenre;
import com.thdpv.movietheater.movie.entity.MovieCountry;
import com.thdpv.movietheater.movie.entity.MovieMedia;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.repository.CinemaRepository;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.cinema.service.CinemaService;
import java.time.LocalDate;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final CinemaRepository cinemaRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final CinemaService cinemaService;

    @Value("${app.auth.seed.admin-email}")
    private String adminEmail;

    @Value("${app.auth.seed.admin-password}")
    private String adminPassword;

    @Value("${app.auth.seed.admin-full-name}")
    private String adminFullName;

    @Value("${app.auth.seed.staff-email}")
    private String staffEmail;

    @Value("${app.auth.seed.staff-password}")
    private String staffPassword;

    @Value("${app.auth.seed.staff-full-name}")
    private String staffFullName;

    @Value("${app.auth.seed.customer-email}")
    private String customerEmail;

    @Value("${app.auth.seed.customer-password}")
    private String customerPassword;

    @Value("${app.auth.seed.customer-full-name}")
    private String customerFullName;

    public DataSeeder(RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            MovieRepository movieRepository,
            GenreRepository genreRepository,
            CountryRepository countryRepository,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            CinemaRepository cinemaRepository,
            CinemaRoomRepository cinemaRoomRepository,
            CinemaService cinemaService) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.movieRepository = movieRepository;
        this.genreRepository = genreRepository;
        this.countryRepository = countryRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.cinemaRepository = cinemaRepository;
        this.cinemaRoomRepository = cinemaRoomRepository;
        this.cinemaService = cinemaService;
    }

    @Override
    public void run(String... args) {
        createDummyTables();
        seedRoles();
        seedAdminUser();
        seedStaffUser();
        seedCustomerUser();
        seedGenres();
        seedCountries();
        seedMovies();
        seedCinemasAndRooms();
    }

    private void createDummyTables() {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS showtime (uuid UUID PRIMARY KEY, movie_uuid UUID)");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS booking (uuid UUID PRIMARY KEY, showtime_uuid UUID)");
            logger.info("Created dummy tables 'showtime' and 'booking' successfully.");
        } catch (Exception e) {
            logger.error("Failed to create dummy tables 'showtime' and 'booking'", e);
        }
    }

    private void seedRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = new Role();
                role.setName(roleName);
                role.setDescription(roleName.name() + " role");
                roleRepository.save(role);
                logger.info("Seeded role: {}", roleName);
            }
        }
    }

    private void seedAdminUser() {
        createUserIfNotExists(adminEmail, adminPassword, adminFullName, RoleName.ADMIN);
    }

    private void seedStaffUser() {
        createUserIfNotExists(staffEmail, staffPassword, staffFullName, RoleName.STAFF);
    }

    private void seedCustomerUser() {
        createUserIfNotExists(customerEmail, customerPassword, customerFullName, RoleName.CUSTOMER);
    }

    private void createUserIfNotExists(String email, String password, String fullName, RoleName roleName) {
        java.util.Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(email);

        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            // ✅ Chỉ update password + status, KHÔNG reset fullName và avatarUrl
            user.setPassword(passwordEncoder.encode(password));
            user.setStatus(UserStatus.ACTIVE);
            if (user.getAuthProvider() == null) {
                user.setAuthProvider(AuthProvider.LOCAL);
            }
            userRepository.save(user);
            logger.info("Updated existing {} user '{}' password from env configuration.",
                    roleName.name(), email);
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException(roleName.name() + " role not found"));

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        logger.info("Seeded {} user: {}", roleName.name(), email);
    }

    private void seedGenres() {
        String[] genres = { "Hành động", "Kịch tính", "Viễn tưởng", "Tình cảm", "Chiến tranh", "Hoạt hình",
                "Phiêu lưu" };
        for (String name : genres) {
            if (!genreRepository.existsByNameIgnoreCase(name)) {
                Genre genre = new Genre();
                genre.setName(name);
                genreRepository.save(genre);
                logger.info("Seeded genre: {}", name);
            }
        }
    }

    private void seedCountries() {
        Object[][] countries = {
                { "VN", "Việt Nam" },
                { "US", "Mỹ" },
                { "JP", "Nhật Bản" },
                { "CN", "Trung Quốc" }
        };
        for (Object[] countryData : countries) {
            String code = (String) countryData[0];
            String name = (String) countryData[1];
            if (!countryRepository.existsByCodeIgnoreCase(code)) {
                Country country = new Country();
                country.setCode(code);
                country.setName(name);
                countryRepository.save(country);
                logger.info("Seeded country: {}", name);
            }
        }
    }

    private void seedMovies() {
        // Tự động chuyển đổi các phim cũ có status "LIVE" thành "NOW_SHOWING" để đồng
        // bộ hóa
        List<Movie> existingMovies = movieRepository.findAll();
        for (Movie m : existingMovies) {
            if ("LIVE".equalsIgnoreCase(m.getStatus())) {
                m.setStatus("NOW_SHOWING");
                movieRepository.save(m);
                logger.info("Updated status of existing movie '{}' to 'NOW_SHOWING'", m.getTitle());
            }
        }

        // 1. Kẻ Ẩn Danh
        createMovieIfNotExists(
                "Kẻ Ẩn Danh",
                "Lâm - một cựu giang hồ ẩn danh muốn sống yên bình bên gia đình, nhưng số phận đẩy anh vào một cuộc chiến sinh tử để cứu con gái.",
                110,
                LocalDate.of(2023, 8, 25),
                "NOW_SHOWING",
                List.of("Hành động", "Kịch tính"),
                List.of("VN"),
                List.of(
                        new MovieMediaData("https://java-06.s3.ap-southeast-1.amazonaws.com/poster/KeAnDanh_Poster.jpg",
                                "POSTER", "KeAnDanh Poster", true, 1),
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/trailer/KeAnDanh_Trailer.mp4",
                                "TRAILER", "KeAnDanh Trailer", false, 2)));

        // 2. Mortal Kombat 2
        createMovieIfNotExists(
                "Mortal Kombat 2",
                "Cuộc chiến giành số phận Earthrealm tiếp tục diễn ra với những võ sĩ huyền thoại chống lại các thế lực Outworld.",
                125,
                LocalDate.of(2025, 10, 24),
                "NOW_SHOWING",
                List.of("Hành động", "Viễn tưởng"),
                List.of("US"),
                List.of(
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/poster/MortalKombat2_Poster.jpg",
                                "POSTER", "MortalKombat2 Poster", true, 1),
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/trailer/MortalKombat2_Trailer.mp4",
                                "TRAILER", "MortalKombat2 Trailer", false, 2)));

        // 3. Mưa Đỏ
        createMovieIfNotExists(
                "Mưa Đỏ",
                "Tác phẩm nghệ thuật đầy bi tráng về tình yêu và lòng quả cảm trong những năm tháng chiến tranh khốc liệt.",
                95,
                LocalDate.of(2024, 4, 30),
                "NOW_SHOWING",
                List.of("Tình cảm", "Chiến tranh"),
                List.of("VN"),
                List.of(
                        new MovieMediaData("https://java-06.s3.ap-southeast-1.amazonaws.com/poster/MuaDo_Poster.jpg",
                                "POSTER", "MuaDo Poster", true, 1),
                        new MovieMediaData("https://java-06.s3.ap-southeast-1.amazonaws.com/trailer/MuaDo_Trailer.mp4",
                                "TRAILER", "MuaDo Trailer", false, 2)));

        // 4. Thanh Gươm Diệt Quỷ
        createMovieIfNotExists(
                "Thanh Gươm Diệt Quỷ",
                "Tanjirou cùng các trụ cột bước vào cuộc chiến sinh tử chống lại chúa quỷ Muzan trong pháo đài vô tận.",
                105,
                LocalDate.of(2024, 2, 23),
                "NOW_SHOWING",
                List.of("Hoạt hình", "Hành động"),
                List.of("JP"),
                List.of(
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/poster/ThanhGuongDietQuy_Poster.gif",
                                "POSTER", "ThanhGuongDietQuy Poster", true, 1),
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/trailer/ThanhGuongDietQuy_Trailer.mp4",
                                "TRAILER", "ThanhGuongDietQuy Trailer", false, 2)));

        // 5. Truy Tìm Long Diên Hương
        createMovieIfNotExists(
                "Truy Tìm Long Diên Hương",
                "Cuộc phiêu lưu mạo hiểm tìm kiếm báu vật vô giá Long Diên Hương dưới đáy biển sâu thẳm.",
                100,
                LocalDate.of(2024, 6, 1),
                "NOW_SHOWING",
                List.of("Phiêu lưu", "Kịch tính"),
                List.of("CN"),
                List.of(
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/poster/TruyTimLongDienHuong_Poster.jpg",
                                "POSTER", "TruyTimLongDienHuong Poster", true, 1),
                        new MovieMediaData(
                                "https://java-06.s3.ap-southeast-1.amazonaws.com/trailer/TruyTimLongDienHuong_Trailer.mp4",
                                "TRAILER", "TruyTimLongDienHuong Trailer", false, 2)));
    }

    private void createMovieIfNotExists(
            String title,
            String description,
            int durationMinutes,
            LocalDate releaseDate,
            String status,
            List<String> genreNames,
            List<String> countryCodes,
            List<MovieMediaData> mediaList) {

        if (movieRepository.existsByTitleIgnoreCase(title)) {
            return;
        }

        Movie movie = new Movie();
        movie.setTitle(title);
        movie.setDescription(description);
        movie.setDurationMinutes(durationMinutes);
        movie.setReleaseDate(releaseDate);
        movie.setStatus(status);

        // Add Genres
        for (String genreName : genreNames) {
            Genre genre = genreRepository.findByNameIgnoreCase(genreName)
                    .orElseThrow(() -> new RuntimeException("Genre not found: " + genreName));
            MovieGenre movieGenre = new MovieGenre();
            movieGenre.setMovie(movie);
            movieGenre.setGenre(genre);
            movie.addMovieGenre(movieGenre);
        }

        // Add Countries
        for (String countryCode : countryCodes) {
            Country country = countryRepository.findByCodeIgnoreCase(countryCode)
                    .orElseThrow(() -> new RuntimeException("Country not found: " + countryCode));
            MovieCountry movieCountry = new MovieCountry();
            movieCountry.setMovie(movie);
            movieCountry.setCountry(country);
            movie.addMovieCountry(movieCountry);
        }

        // Add Medias
        for (MovieMediaData mediaData : mediaList) {
            MovieMedia media = new MovieMedia();
            media.setMovie(movie);
            media.setMediaUrl(mediaData.url);
            media.setMediaType(mediaData.type);
            media.setTitle(mediaData.title);
            media.setIsPrimary(mediaData.isPrimary);
            media.setSortOrder(mediaData.sortOrder);
            movie.addMovieMedia(media);
        }

        movieRepository.save(movie);
        logger.info("Seeded movie: {}", title);
    }

    private static class MovieMediaData {
        String url;
        String type;
        String title;
        boolean isPrimary;
        int sortOrder;

        MovieMediaData(String url, String type, String title, boolean isPrimary, int sortOrder) {
            this.url = url;
            this.type = type;
            this.title = title;
            this.isPrimary = isPrimary;
            this.sortOrder = sortOrder;
        }
    }

    private void seedCinemasAndRooms() {
        if (cinemaRepository.count() > 0) {
            return;
        }

        // Create Cinema
        Cinema cinema = new Cinema();
        cinema.setName("NASA Landmark 81");
        cinema.setAddress("Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh, TP.HCM");
        cinema.setPhoneNumber("19001080");
        Cinema savedCinema = cinemaRepository.save(cinema);
        logger.info("Seeded cinema: {}", savedCinema.getName());

        // Create Room 1 (matching default FE name)
        CinemaRoom room1 = new CinemaRoom();
        room1.setCinema(savedCinema);
        room1.setName("Phòng chiếu IMAX");
        room1.setStatus("ACTIVE");
        room1.setCapacity(0);
        CinemaRoom savedRoom1 = cinemaRoomRepository.save(room1);
        logger.info("Seeded room: {}", savedRoom1.getName());

        // Auto-generate seats for Room 1 (NASA Standard Layout)
        cinemaService.generateSeats(savedRoom1.getUuid(), null);
        logger.info("Auto-generated NASA Standard seats for room: {}", savedRoom1.getName());

        // Create Room 2
        CinemaRoom room2 = new CinemaRoom();
        room2.setCinema(savedCinema);
        room2.setName("Phòng chiếu 2");
        room2.setStatus("ACTIVE");
        room2.setCapacity(0);
        CinemaRoom savedRoom2 = cinemaRoomRepository.save(room2);
        logger.info("Seeded room: {}", savedRoom2.getName());

        // Auto-generate seats for Room 2 (NASA Standard Layout)
        cinemaService.generateSeats(savedRoom2.getUuid(), null);
        logger.info("Auto-generated NASA Standard seats for room: {}", savedRoom2.getName());
    }
}
