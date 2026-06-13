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
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.movieRepository = movieRepository;
        this.genreRepository = genreRepository;
        this.countryRepository = countryRepository;
        this.jdbcTemplate = jdbcTemplate;
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
        seedBookingData();
    }

    private void createDummyTables() {
        try {
            // Drop showtime if it does not have the required columns
            jdbcTemplate.execute("DROP TABLE IF EXISTS showtime CASCADE");
            jdbcTemplate.execute("""
                CREATE TABLE showtime (
                    uuid UUID PRIMARY KEY,
                    movie_uuid UUID NOT NULL,
                    cinema_room_uuid UUID NOT NULL,
                    start_time TIMESTAMPTZ NOT NULL,
                    end_time TIMESTAMPTZ NOT NULL
                )
            """);

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS booking (uuid UUID PRIMARY KEY, showtime_uuid UUID)");
            
            // Drop old tables to avoid conflicts when switching branches
            jdbcTemplate.execute("DROP TABLE IF EXISTS seat CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS seat_type CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS cinema_room CASCADE");

            jdbcTemplate.execute("""
                CREATE TABLE cinema_room (
                    uuid UUID PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                )
            """);

            jdbcTemplate.execute("""
                CREATE TABLE seat_type (
                    uuid UUID PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    base_price NUMERIC(10, 2) NOT NULL,
                    price_modifier NUMERIC(10, 2) DEFAULT 1.00
                )
            """);

            jdbcTemplate.execute("""
                CREATE TABLE seat (
                    uuid UUID PRIMARY KEY,
                    cinema_room_uuid UUID NOT NULL,
                    row_name VARCHAR(5) NOT NULL,
                    seat_number INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'ACTIVE',
                    seat_type_uuid UUID NOT NULL
                )
            """);

            jdbcTemplate.execute("DROP TABLE IF EXISTS seat_locked CASCADE");
            jdbcTemplate.execute("""
                CREATE TABLE seat_locked (
                    uuid UUID,
                    showtime_uuid UUID NOT NULL,
                    seat_uuid UUID NOT NULL,
                    user_uuid UUID NOT NULL,
                    locked_at TIMESTAMPTZ,
                    expired_at TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY (showtime_uuid, seat_uuid)
                )
            """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS combo (
                    uuid UUID PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    price NUMERIC(10, 2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'ACTIVE'
                )
            """);

            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS score_history (
                    uuid UUID PRIMARY KEY,
                    user_uuid UUID NOT NULL,
                    score_amount INTEGER NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    description VARCHAR(255),
                    created_at TIMESTAMPTZ NOT NULL
                )
            """);

            jdbcTemplate.execute("DROP TABLE IF EXISTS promotions CASCADE");
            jdbcTemplate.execute("""
                CREATE TABLE promotions (
                    uuid UUID PRIMARY KEY,
                    code VARCHAR(255) NOT NULL UNIQUE,
                    discount_value NUMERIC(15, 2) NOT NULL,
                    discount_type VARCHAR(50) NOT NULL,
                    max_usage INTEGER,
                    used_count INTEGER DEFAULT 0,
                    once_per_user BOOLEAN DEFAULT FALSE,
                    start_date TIMESTAMPTZ,
                    end_date TIMESTAMPTZ,
                    status VARCHAR(50) DEFAULT 'ACTIVE',
                    created_at TIMESTAMPTZ,
                    updated_at TIMESTAMPTZ,
                    created_by UUID,
                    updated_by UUID
                )
            """);

            logger.info("Created booking database tables successfully.");
        } catch (Exception e) {
            logger.error("Failed to create booking database tables", e);
        }
    }

    private void seedBookingData() {
        try {
            java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
            // Clean old data to avoid duplicate key issues on restart
            jdbcTemplate.execute("TRUNCATE TABLE seat_locked CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE seat CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE seat_type CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE cinema_room CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE showtime CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE combo CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE promotions CASCADE");

            logger.info("Truncated existing seat, showtime, combo, and promotion data for seeding.");

            // 1. Seed Cinema Rooms
            java.util.UUID room1Uuid = java.util.UUID.fromString("88888888-8888-8888-8888-888888888888");
            java.util.UUID room2Uuid = java.util.UUID.fromString("99999999-9999-9999-9999-999999999999");
            jdbcTemplate.update("INSERT INTO cinema_room (uuid, name) VALUES (?, ?)", room1Uuid, "Phòng chiếu IMAX");
            jdbcTemplate.update("INSERT INTO cinema_room (uuid, name) VALUES (?, ?)", room2Uuid, "Phòng chiếu VIP");

            // 2. Seed Seat Types
            java.util.UUID stdType = java.util.UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            java.util.UUID vipType = java.util.UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
            java.util.UUID cplType = java.util.UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
            jdbcTemplate.update("INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                    stdType, "STANDARD", java.math.BigDecimal.valueOf(85000), java.math.BigDecimal.valueOf(1.0));
            jdbcTemplate.update("INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                    vipType, "VIP", java.math.BigDecimal.valueOf(120000), java.math.BigDecimal.valueOf(1.0));
            jdbcTemplate.update("INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                    cplType, "COUPLE", java.math.BigDecimal.valueOf(160000), java.math.BigDecimal.valueOf(1.0));

            // 3. Seed Seats for Room 1 and Room 2
            String[] rows = {"A", "B", "C", "D", "E", "F", "G", "H"};
            for (String rowName : rows) {
                java.util.UUID seatTypeUuid;
                if ("G".equals(rowName) || "H".equals(rowName)) {
                    seatTypeUuid = cplType;
                } else if ("E".equals(rowName) || "F".equals(rowName)) {
                    seatTypeUuid = vipType;
                } else {
                    seatTypeUuid = stdType;
                }

                int maxSeats = ("G".equals(rowName) || "H".equals(rowName)) ? 6 : 12;
                for (int num = 1; num <= maxSeats; num++) {
                    jdbcTemplate.update("INSERT INTO seat (uuid, cinema_room_uuid, row_name, seat_number, status, seat_type_uuid) VALUES (?, ?, ?, ?, ?, ?)",
                            java.util.UUID.randomUUID(), room1Uuid, rowName, num, "ACTIVE", seatTypeUuid);
                    jdbcTemplate.update("INSERT INTO seat (uuid, cinema_room_uuid, row_name, seat_number, status, seat_type_uuid) VALUES (?, ?, ?, ?, ?, ?)",
                            java.util.UUID.randomUUID(), room2Uuid, rowName, num, "ACTIVE", seatTypeUuid);
                }
            }

            // 4. Seed Combos
            jdbcTemplate.update("INSERT INTO combo (uuid, name, price, status) VALUES (?, ?, ?, ?)",
                    java.util.UUID.fromString("55555555-5555-5555-5555-555555555555"), "Combo Bắp Nước", java.math.BigDecimal.valueOf(90000), "ACTIVE");

            // 5. Seed Showtimes for movies
            List<Movie> dbMovies = movieRepository.findAll();
            if (!dbMovies.isEmpty()) {
                java.util.UUID movie1 = dbMovies.get(0).getUuid();
                java.util.UUID movie2 = dbMovies.size() > 1 ? dbMovies.get(1).getUuid() : movie1;
                java.util.UUID movie3 = dbMovies.size() > 2 ? dbMovies.get(2).getUuid() : movie1;
                java.util.UUID movie4 = dbMovies.size() > 3 ? dbMovies.get(3).getUuid() : movie1;

                jdbcTemplate.update("INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                        java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"), movie1, room1Uuid,
                        now.withHour(19).withMinute(30).withSecond(0).withNano(0), now.withHour(21).withMinute(30).withSecond(0).withNano(0));

                jdbcTemplate.update("INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                        java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"), movie2, room1Uuid,
                        now.withHour(21).withMinute(0).withSecond(0).withNano(0), now.withHour(23).withMinute(0).withSecond(0).withNano(0));

                jdbcTemplate.update("INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                        java.util.UUID.fromString("33333333-3333-3333-3333-333333333333"), movie3, room2Uuid,
                        now.withHour(18).withMinute(0).withSecond(0).withNano(0), now.withHour(20).withMinute(0).withSecond(0).withNano(0));

                jdbcTemplate.update("INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                        java.util.UUID.fromString("44444444-4444-4444-4444-444444444444"), movie4, room2Uuid,
                        now.withHour(20).withMinute(45).withSecond(0).withNano(0), now.withHour(22).withMinute(45).withSecond(0).withNano(0));
            }

            // 6. Seed Vouchers
            jdbcTemplate.update("""
                INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            java.util.UUID.fromString("11111111-1111-1111-1111-aaaaaaaaaaaa"),
            "THDPV50",
            java.math.BigDecimal.valueOf(0.50),
            "PERCENTAGE",
            100,
            0,
            false,
            now.minusDays(1),
            now.plusDays(30),
            "ACTIVE",
            now,
            now);

            jdbcTemplate.update("""
                INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            java.util.UUID.fromString("22222222-2222-2222-2222-bbbbbbbbbbbb"),
            "CINELUXE",
            java.math.BigDecimal.valueOf(30000.00),
            "FIXED_AMOUNT",
            200,
            0,
            false,
            now.minusDays(1),
            now.plusDays(30),
            "ACTIVE",
            now,
            now);

            jdbcTemplate.update("""
                INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            java.util.UUID.fromString("33333333-3333-3333-3333-cccccccccccc"),
            "NASAFIRST",
            java.math.BigDecimal.valueOf(50000.00),
            "FIXED_AMOUNT",
            500,
            0,
            true,
            now.minusDays(1),
            now.plusDays(30),
            "ACTIVE",
            now,
            now);

            logger.info("Successfully seeded cinema rooms, seats, showtimes, combos, and promotions.");
        } catch (Exception e) {
            logger.error("Failed to seed booking database data", e);
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
}
