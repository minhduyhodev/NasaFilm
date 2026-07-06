package com.thdpv.movietheater.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import com.thdpv.movietheater.auth.repository.PermissionRepository;
import com.thdpv.movietheater.auth.repository.RolePermissionRepository;
import com.thdpv.movietheater.auth.repository.UserRoleRepository;
import com.thdpv.movietheater.config.repository.RoleRepository;
import com.thdpv.movietheater.user.entity.Permission;
import com.thdpv.movietheater.user.entity.Role;
import com.thdpv.movietheater.user.entity.RolePermission;
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
import com.thdpv.movietheater.movie.entity.Actor;
import com.thdpv.movietheater.movie.entity.MovieActor;
import com.thdpv.movietheater.movie.repository.MovieRepository;
import com.thdpv.movietheater.movie.repository.GenreRepository;
import com.thdpv.movietheater.movie.repository.CountryRepository;
import com.thdpv.movietheater.movie.repository.ActorRepository;
import com.thdpv.movietheater.cinema.entity.Cinema;
import com.thdpv.movietheater.cinema.entity.CinemaRoom;
import com.thdpv.movietheater.cinema.enums.CinemaRoomStatus;
import com.thdpv.movietheater.cinema.enums.RoomType;
import com.thdpv.movietheater.cinema.enums.SeatStatus;
import com.thdpv.movietheater.cinema.repository.CinemaRepository;
import com.thdpv.movietheater.cinema.repository.CinemaRoomRepository;
import com.thdpv.movietheater.cinema.service.CinemaService;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CountryRepository countryRepository;
    private final JdbcTemplate jdbcTemplate;
    private final CinemaRepository cinemaRepository;
    private final CinemaRoomRepository cinemaRoomRepository;
    private final CinemaService cinemaService;
    private final ReferenceMetadataSeeder referenceMetadataSeeder;
    private final ActorRepository actorRepository;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

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
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            MovieRepository movieRepository,
            GenreRepository genreRepository,
            CountryRepository countryRepository,
            JdbcTemplate jdbcTemplate,
            CinemaRepository cinemaRepository,
            CinemaRoomRepository cinemaRoomRepository,
            CinemaService cinemaService,
            ReferenceMetadataSeeder referenceMetadataSeeder,
            ActorRepository actorRepository,
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            PlatformTransactionManager transactionManager) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
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
        this.referenceMetadataSeeder = referenceMetadataSeeder;
        this.actorRepository = actorRepository;
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(String... args) {
        createDummyTables();
        if (!seedEnabled) {
            logger.info("Database seeding is disabled via configuration (app.seed.enabled = false).");
            return;
        }
        healWalletVersionColumn();
        healUserSchemaColumns();
        seedRoles();
        seedAdminUser();
        seedStaffUser();
        seedCustomerUser();
        seedPermissions();
        seedRolePermissions();
        seedGuestAccount();
        seedUsersFromJson();
        referenceMetadataSeeder.seedAll();
        seedSeatTypes();
        seedActors();
        seedMovies();

        // Self-healing: Cập nhật giá vé Online mặc định cho các phim đã tồn tại nhưng
        // có online_price là null
        try {
            jdbcTemplate.update("UPDATE movie SET online_price = 45000 WHERE online_price IS NULL");
            logger.info("Successfully self-healed online_price for existing movies.");
        } catch (Exception e) {
            logger.error("Failed to self-heal online_price", e);
        }

        seedCinemasAndRooms();
        seedCombos();
        seedPromotions();
        seedShowtimes();
        repairOrphanBookingSeats();
    }

    private void createDummyTables() {
        try {
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS showtime (
                            uuid UUID PRIMARY KEY,
                            movie_uuid UUID NOT NULL,
                            cinema_room_uuid UUID NOT NULL,
                            start_time TIMESTAMPTZ NOT NULL,
                            end_time TIMESTAMPTZ,
                            base_price NUMERIC(21, 2) NOT NULL DEFAULT 0.00,
                            status VARCHAR(50) DEFAULT 'DRAFT',
                            created_at TIMESTAMPTZ,
                            updated_at TIMESTAMPTZ
                        )
                    """);
            jdbcTemplate.execute(
                    "ALTER TABLE showtime ADD COLUMN IF NOT EXISTS base_price NUMERIC(21, 2) NOT NULL DEFAULT 0.00");
            jdbcTemplate.execute("ALTER TABLE showtime ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT'");
            jdbcTemplate.execute("ALTER TABLE showtime ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ");
            jdbcTemplate.execute("ALTER TABLE showtime ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS booking (uuid UUID PRIMARY KEY, showtime_uuid UUID)");
            try {
                jdbcTemplate.execute("ALTER TABLE booking ALTER COLUMN showtime_uuid DROP NOT NULL");
                logger.info("Altered booking table to make showtime_uuid nullable.");
            } catch (Exception e) {
                logger.warn("Could not alter booking showtime_uuid column: {}", e.getMessage());
            }

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS cinema_room (
                            uuid UUID PRIMARY KEY,
                            room_code VARCHAR(255),
                            name VARCHAR(255) NOT NULL,
                            capacity INTEGER,
                            room_type VARCHAR(255) NOT NULL DEFAULT 'STANDARD',
                            status VARCHAR(255),
                            cinema_uuid UUID NOT NULL
                        )
                    """);
            jdbcTemplate.execute("ALTER TABLE cinema_room ADD COLUMN IF NOT EXISTS room_code VARCHAR(255)");
            jdbcTemplate.execute(
                    "ALTER TABLE cinema_room ADD COLUMN IF NOT EXISTS room_type VARCHAR(255) NOT NULL DEFAULT 'STANDARD'");

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS seat_type (
                            uuid UUID PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            base_price NUMERIC(10, 2) NOT NULL,
                            price_modifier NUMERIC(10, 2) DEFAULT 1.00
                        )
                    """);

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS seat (
                            uuid UUID PRIMARY KEY,
                            cinema_room_uuid UUID NOT NULL,
                            row_name VARCHAR(5) NOT NULL,
                            seat_number INTEGER NOT NULL,
                            status VARCHAR(50) DEFAULT 'ACTIVE',
                            seat_type_uuid UUID NOT NULL,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE
                        )
                    """);
            jdbcTemplate.execute("ALTER TABLE seat ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE");

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS seat_locked (
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

            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS promotions (
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
            migrateVoucherAndScoreSchema();
            createPermissionTables();
        } catch (Exception e) {
            logger.error("Failed to create booking database tables", e);
        }
    }

    private void createPermissionTables() {
        try {
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS permissions (
                            uuid UUID PRIMARY KEY,
                            name VARCHAR(100) NOT NULL UNIQUE,
                            description VARCHAR(255),
                            created_at TIMESTAMPTZ,
                            updated_at TIMESTAMPTZ
                        )
                    """);
            jdbcTemplate.execute("""
                        CREATE TABLE IF NOT EXISTS role_permissions (
                            uuid UUID PRIMARY KEY,
                            role_id UUID NOT NULL,
                            permission_id UUID NOT NULL,
                            created_at TIMESTAMPTZ,
                            CONSTRAINT uk_role_permissions_role_permission UNIQUE (role_id, permission_id)
                        )
                    """);
            logger.info("Created permissions and role_permissions tables.");
        } catch (Exception e) {
            logger.error("Failed to create permissions tables", e);
        }
    }

    private void seedPermissions() {
        String[][] permissionDefs = {
                { "aaaaaaaa-0001-aaaa-aaaa-aaaaaaaaaaaa", "TICKET_CHECKIN", "Soát vé" },
                { "aaaaaaaa-0002-aaaa-aaaa-aaaaaaaaaaaa", "COUNTER_BOOKING_CREATE", "Bán vé tại quầy" },
                { "aaaaaaaa-0003-aaaa-aaaa-aaaaaaaaaaaa", "COUNTER_COMBO_CREATE", "Bán combo tại quầy" },
                { "aaaaaaaa-0004-aaaa-aaaa-aaaaaaaaaaaa", "COUNTER_VOUCHER_APPLY", "Áp voucher tại quầy" },
                { "aaaaaaaa-0005-aaaa-aaaa-aaaaaaaaaaaa", "COUNTER_REFUND_PROCESS", "Hoàn tiền tại quầy" },
                { "aaaaaaaa-0006-aaaa-aaaa-aaaaaaaaaaaa", "COUNTER_CUSTOMER_CREATE", "Tạo tài khoản nhanh" }
        };

        for (String[] def : permissionDefs) {
            String name = def[1];
            UUID permissionId = UUID.fromString(def[0]);
            Integer existing = jdbcTemplate.queryForObject(
                    "SELECT count(1) FROM permissions WHERE uuid = ? OR name = ?",
                    Integer.class,
                    permissionId,
                    name);
            if (existing != null && existing > 0) {
                continue;
            }
            jdbcTemplate.update(
                    "INSERT INTO permissions (uuid, name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
                    permissionId,
                    name,
                    def[2]);
            logger.info("Seeded permission: {}", name);
        }
    }

    private void seedRolePermissions() {
        Role staffRole = roleRepository.findByName(RoleName.STAFF)
                .orElse(null);
        Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElse(null);

        List<Permission> allPermissions = permissionRepository.findAll();
        if (allPermissions.isEmpty()) {
            return;
        }

        for (Permission permission : allPermissions) {
            if (staffRole != null) {
                seedRolePermissionIfNotExists(staffRole.getId(), permission.getId());
            }
            if (adminRole != null) {
                seedRolePermissionIfNotExists(adminRole.getId(), permission.getId());
            }
        }
    }

    private void seedRolePermissionIfNotExists(UUID roleId, UUID permissionId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(1) FROM role_permissions WHERE role_id = ? AND permission_id = ?",
                Integer.class, roleId, permissionId);
        if (count != null && count == 0) {
            RolePermission rp = new RolePermission();
            rp.setRoleId(roleId);
            rp.setPermissionId(permissionId);
            rolePermissionRepository.save(rp);
        }
    }

    private void seedGuestAccount() {
        final String guestEmail = "counter_guest@nasafilm.com";
        if (userRepository.findByEmailIgnoreCase(guestEmail).isPresent()) {
            return;
        }

        transactionTemplate.executeWithoutResult(status -> {
            User guest = new User();
            guest.setEmail(guestEmail);
            guest.setFullName("Counter Guest");
            guest.setIsSystemAccount(true);
            guest.setAuthProvider(AuthProvider.LOCAL);
            guest.setStatus(UserStatus.ACTIVE);
            guest = userRepository.saveAndFlush(guest);
            assignRoleIfMissing(guest, RoleName.CUSTOMER);
            logger.info("Seeded guest account: {}", guestEmail);
        });
    }

    private void migrateVoucherAndScoreSchema() {
        try {
            jdbcTemplate
                    .execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_score INTEGER NOT NULL DEFAULT 0");
            jdbcTemplate.execute("""
                    UPDATE users
                    SET lifetime_score = GREATEST(COALESCE(score, 0), COALESCE(lifetime_score, 0))
                    WHERE COALESCE(lifetime_score, 0) = 0
                    """);
            jdbcTemplate
                    .execute("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS points_cost INTEGER NOT NULL DEFAULT 0");
            jdbcTemplate
                    .execute("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_score INTEGER NOT NULL DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS max_usage_per_user INTEGER");
            jdbcTemplate.execute("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ");
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS user_voucher (
                        uuid UUID PRIMARY KEY,
                        user_uuid UUID NOT NULL,
                        promotion_uuid UUID NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        redeemed_at TIMESTAMPTZ NOT NULL,
                        used_at TIMESTAMPTZ,
                        booking_uuid UUID
                    )
                    """);
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS payment (
                        uuid UUID PRIMARY KEY,
                        booking_uuid UUID NOT NULL,
                        amount NUMERIC(15, 2) NOT NULL,
                        currency VARCHAR(16) NOT NULL DEFAULT 'VND',
                        method VARCHAR(64),
                        status VARCHAR(32) NOT NULL,
                        gateway_provider VARCHAR(64),
                        gateway_transaction_id VARCHAR(255),
                        idempotency_key VARCHAR(255) UNIQUE,
                        paid_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL
                    )
                    """);
            jdbcTemplate.execute("""
                    CREATE INDEX IF NOT EXISTS idx_payment_booking ON payment (booking_uuid)
                    """);
            logger.info("Migrated voucher redemption and lifetime score schema.");

            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS support_ticket (
                        uuid UUID PRIMARY KEY,
                        ticket_code VARCHAR(32) NOT NULL UNIQUE,
                        owner_email VARCHAR(255) NOT NULL,
                        owner_name VARCHAR(255),
                        category VARCHAR(80) NOT NULL,
                        description TEXT NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        answer TEXT,
                        admin_note TEXT,
                        last_message TEXT,
                        last_message_sender VARCHAR(24),
                        read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMPTZ,
                        updated_at TIMESTAMPTZ
                    )
                    """);
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS support_ticket_message (
                        uuid UUID PRIMARY KEY,
                        ticket_uuid UUID NOT NULL,
                        sender_role VARCHAR(24) NOT NULL,
                        sender_name VARCHAR(255),
                        message TEXT NOT NULL,
                        created_at TIMESTAMPTZ
                    )
                    """);
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_support_ticket_owner ON support_ticket (owner_email)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket (status)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_support_ticket_message_ticket ON support_ticket_message (ticket_uuid)");

            jdbcTemplate.update("""
                    UPDATE promotions
                    SET status = 'ACTIVE',
                        end_date = ?,
                        updated_at = ?
                    WHERE COALESCE(points_cost, 0) = 0
                      AND (status <> 'ACTIVE' OR end_date IS NULL OR end_date < ?)
                    """,
                    java.time.OffsetDateTime.now().plusYears(1),
                    java.time.OffsetDateTime.now(),
                    java.time.OffsetDateTime.now());
        } catch (Exception e) {
            logger.error("Failed to migrate voucher/score schema", e);
        }
    }

    private void seedBookingData() {
        try {
            java.time.OffsetDateTime now = java.time.OffsetDateTime.now();

            // 1. Seed Cinema Rooms (JDBC Seed)
            java.util.UUID cinemaUuid = java.util.UUID.fromString("77777777-7777-7777-7777-777777777777");
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM cinema WHERE uuid = ?", Integer.class,
                    cinemaUuid) == 0) {
                jdbcTemplate.update("INSERT INTO cinema (uuid, name, address, phone_number) VALUES (?, ?, ?, ?)",
                        cinemaUuid, "NASA Landmark 81 JDBC", "Landmark 81, HCM", "19001080");
            }

            java.util.UUID room1Uuid = java.util.UUID.fromString("88888888-8888-8888-8888-888888888888");
            java.util.UUID room2Uuid = java.util.UUID.fromString("99999999-9999-9999-9999-999999999999");

            if (jdbcTemplate.queryForObject("SELECT count(1) FROM cinema_room WHERE uuid = ?", Integer.class,
                    room1Uuid) == 0) {
                jdbcTemplate.update(
                        "INSERT INTO cinema_room (uuid, room_code, name, capacity, room_type, status, cinema_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        room1Uuid, "ROOM-IMAX", "Phòng chiếu IMAX", 0, "IMAX", "ACTIVE", cinemaUuid);
            }
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM cinema_room WHERE uuid = ?", Integer.class,
                    room2Uuid) == 0) {
                jdbcTemplate.update(
                        "INSERT INTO cinema_room (uuid, room_code, name, capacity, room_type, status, cinema_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        room2Uuid, "ROOM-VIP", "Phòng chiếu VIP", 0, "VIP", "ACTIVE", cinemaUuid);
            }

            // 2. Seed Seat Types
            java.util.UUID stdType = java.util.UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            java.util.UUID vipType = java.util.UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
            java.util.UUID cplType = java.util.UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");

            if (jdbcTemplate.queryForObject("SELECT count(1) FROM seat_type WHERE uuid = ?", Integer.class,
                    stdType) == 0) {
                jdbcTemplate.update(
                        "INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                        stdType, "STANDARD", java.math.BigDecimal.valueOf(85000), java.math.BigDecimal.valueOf(1.0));
            }
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM seat_type WHERE uuid = ?", Integer.class,
                    vipType) == 0) {
                jdbcTemplate.update(
                        "INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                        vipType, "VIP", java.math.BigDecimal.valueOf(120000), java.math.BigDecimal.valueOf(1.0));
            }
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM seat_type WHERE uuid = ?", Integer.class,
                    cplType) == 0) {
                jdbcTemplate.update(
                        "INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                        cplType, "COUPLE", java.math.BigDecimal.valueOf(160000), java.math.BigDecimal.valueOf(1.0));
            }

            // 3. Seed Seats for Room 1 and Room 2
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM seat WHERE cinema_room_uuid = ?", Integer.class,
                    room1Uuid) == 0) {
                String[] rows = { "A", "B", "C", "D", "E", "F", "G", "H" };
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
                        java.util.UUID seat1Uuid = java.util.UUID
                                .nameUUIDFromBytes((room1Uuid.toString() + "_" + rowName + "_" + num)
                                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
                        java.util.UUID seat2Uuid = java.util.UUID
                                .nameUUIDFromBytes((room2Uuid.toString() + "_" + rowName + "_" + num)
                                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
                        jdbcTemplate.update(
                                "INSERT INTO seat (uuid, cinema_room_uuid, row_name, seat_number, status, seat_type_uuid, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                seat1Uuid, room1Uuid, rowName, num, "ACTIVE", seatTypeUuid, true);
                        jdbcTemplate.update(
                                "INSERT INTO seat (uuid, cinema_room_uuid, row_name, seat_number, status, seat_type_uuid, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                seat2Uuid, room2Uuid, rowName, num, "ACTIVE", seatTypeUuid, true);
                    }
                }
            }

            // 4. Seed Combos
            java.util.UUID comboUuid = java.util.UUID.fromString("55555555-5555-5555-5555-555555555555");
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM combo WHERE uuid = ?", Integer.class,
                    comboUuid) == 0) {
                jdbcTemplate.update("INSERT INTO combo (uuid, name, price, status) VALUES (?, ?, ?, ?)",
                        comboUuid, "Combo Bắp Nước", java.math.BigDecimal.valueOf(90000), "ACTIVE");
            }

            java.util.UUID comboSoloUuid = java.util.UUID.fromString("55555555-5555-5555-5555-666666666666");
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM combo WHERE uuid = ?", Integer.class,
                    comboSoloUuid) == 0) {
                jdbcTemplate.update("INSERT INTO combo (uuid, name, price, status) VALUES (?, ?, ?, ?)",
                        comboSoloUuid, "Combo Solo (1 Bắp + 1 Nước)", java.math.BigDecimal.valueOf(70000), "ACTIVE");
            }

            java.util.UUID comboFamilyUuid = java.util.UUID.fromString("55555555-5555-5555-5555-777777777777");
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM combo WHERE uuid = ?", Integer.class,
                    comboFamilyUuid) == 0) {
                jdbcTemplate.update("INSERT INTO combo (uuid, name, price, status) VALUES (?, ?, ?, ?)",
                        comboFamilyUuid, "Combo Gia Đình (2 Bắp + 4 Nước)", java.math.BigDecimal.valueOf(160000),
                        "ACTIVE");
            }

            // 5. Seed Showtimes for movies
            List<Movie> dbMovies = movieRepository.findAll();
            if (!dbMovies.isEmpty()) {
                java.util.UUID movie1 = dbMovies.get(0).getUuid();
                java.util.UUID movie2 = dbMovies.size() > 1 ? dbMovies.get(1).getUuid() : movie1;
                java.util.UUID movie3 = dbMovies.size() > 2 ? dbMovies.get(2).getUuid() : movie1;
                java.util.UUID movie4 = dbMovies.size() > 3 ? dbMovies.get(3).getUuid() : movie1;

                java.util.UUID showtime1Uuid = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
                java.util.UUID showtime2Uuid = java.util.UUID.fromString("22222222-2222-2222-2222-222222222222");
                java.util.UUID showtime3Uuid = java.util.UUID.fromString("33333333-3333-3333-3333-333333333333");
                java.util.UUID showtime4Uuid = java.util.UUID.fromString("44444444-4444-4444-4444-444444444444");

                if (jdbcTemplate.queryForObject("SELECT count(1) FROM showtime WHERE uuid = ?", Integer.class,
                        showtime1Uuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            showtime1Uuid, movie1, room1Uuid,
                            now.withHour(19).withMinute(30).withSecond(0).withNano(0),
                            now.withHour(21).withMinute(30).withSecond(0).withNano(0),
                            java.math.BigDecimal.valueOf(80000), "OPEN_FOR_BOOKING");
                }
                if (jdbcTemplate.queryForObject("SELECT count(1) FROM showtime WHERE uuid = ?", Integer.class,
                        showtime2Uuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            showtime2Uuid, movie2, room1Uuid,
                            now.withHour(21).withMinute(0).withSecond(0).withNano(0),
                            now.withHour(23).withMinute(0).withSecond(0).withNano(0),
                            java.math.BigDecimal.valueOf(80000), "OPEN_FOR_BOOKING");
                }
                if (jdbcTemplate.queryForObject("SELECT count(1) FROM showtime WHERE uuid = ?", Integer.class,
                        showtime3Uuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            showtime3Uuid, movie3, room2Uuid,
                            now.withHour(18).withMinute(0).withSecond(0).withNano(0),
                            now.withHour(20).withMinute(0).withSecond(0).withNano(0),
                            java.math.BigDecimal.valueOf(80000), "OPEN_FOR_BOOKING");
                }
                if (jdbcTemplate.queryForObject("SELECT count(1) FROM showtime WHERE uuid = ?", Integer.class,
                        showtime4Uuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            showtime4Uuid, movie4, room2Uuid,
                            now.withHour(20).withMinute(45).withSecond(0).withNano(0),
                            now.withHour(22).withMinute(45).withSecond(0).withNano(0),
                            java.math.BigDecimal.valueOf(80000), "OPEN_FOR_BOOKING");
                }
            }

            // 6. Seed Vouchers
            java.util.UUID promo1Uuid = java.util.UUID.fromString("11111111-1111-1111-1111-aaaaaaaaaaaa");
            java.util.UUID promo2Uuid = java.util.UUID.fromString("22222222-2222-2222-2222-bbbbbbbbbbbb");
            java.util.UUID promo3Uuid = java.util.UUID.fromString("33333333-3333-3333-3333-cccccccccccc");

            if (jdbcTemplate.queryForObject("SELECT count(1) FROM promotions WHERE uuid = ?", Integer.class,
                    promo1Uuid) == 0) {
                jdbcTemplate.update(
                        """
                                    INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                        promo1Uuid,
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
            }
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM promotions WHERE uuid = ?", Integer.class,
                    promo2Uuid) == 0) {
                jdbcTemplate.update(
                        """
                                    INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                        promo2Uuid,
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
            }
            if (jdbcTemplate.queryForObject("SELECT count(1) FROM promotions WHERE uuid = ?", Integer.class,
                    promo3Uuid) == 0) {
                jdbcTemplate.update(
                        """
                                    INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                        promo3Uuid,
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
            }

            logger.info("Successfully seeded cinema rooms, seats, showtimes, combos, and promotions.");
        } catch (Exception e) {
            logger.error("Failed to seed booking database data", e);
        }
    }

    private void healWalletVersionColumn() {
        try {
            Integer exists = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'users'
                      AND column_name = 'wallet_version'
                    """, Integer.class);
            if (exists == null || exists == 0) {
                jdbcTemplate.execute(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_version BIGINT NOT NULL DEFAULT 0");
                logger.info("Added users.wallet_version column with default 0.");
            } else {
                jdbcTemplate.update("UPDATE users SET wallet_version = 0 WHERE wallet_version IS NULL");
            }
        } catch (Exception e) {
            logger.warn("wallet_version self-heal skipped: {}", e.getMessage());
        }
    }

    private void seedRoles() {
        List<Map<String, String>> rolesToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/roles.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    rolesToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, String>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load roles.json, falling back to default", e);
        }

        if (rolesToSeed == null || rolesToSeed.isEmpty()) {
            for (RoleName roleName : RoleName.values()) {
                if (roleRepository.findByName(roleName).isEmpty()) {
                    Role role = new Role();
                    role.setName(roleName);
                    role.setDescription(roleName.name() + " role");
                    roleRepository.save(role);
                    logger.info("Seeded default role: {}", roleName);
                }
            }
        } else {
            for (Map<String, String> roleData : rolesToSeed) {
                String nameStr = roleData.get("name");
                String description = roleData.get("description");
                if (nameStr != null) {
                    try {
                        RoleName roleName = RoleName.valueOf(nameStr.toUpperCase());
                        if (roleRepository.findByName(roleName).isEmpty()) {
                            Role role = new Role();
                            role.setName(roleName);
                            role.setDescription(description != null ? description : roleName.name() + " role");
                            roleRepository.save(role);
                            logger.info("Seeded role from JSON: {}", roleName);
                        }
                    } catch (IllegalArgumentException ex) {
                        logger.error("Invalid role name in JSON: {}", nameStr);
                    }
                }
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

    private void seedUsersFromJson() {
        try {
            Resource resource = resourceLoader.getResource("classpath:data/users.json");
            if (!resource.exists()) {
                return;
            }
            List<Map<String, String>> usersToSeed;
            try (InputStream is = resource.getInputStream()) {
                usersToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, String>>>() {
                });
            }
            if (usersToSeed == null || usersToSeed.isEmpty()) {
                return;
            }
            for (Map<String, String> userData : usersToSeed) {
                String email = userData.get("email");
                String password = userData.get("password");
                String fullName = userData.get("fullName");
                String roleNameStr = userData.get("role");
                if (email == null || password == null || roleNameStr == null) {
                    continue;
                }
                try {
                    RoleName roleName = RoleName.valueOf(roleNameStr.toUpperCase());
                    createUserIfNotExists(email, password, fullName != null ? fullName : email, roleName);
                } catch (IllegalArgumentException ex) {
                    logger.error("Invalid role name '{}' for user '{}'", roleNameStr, email);
                }
            }
        } catch (Exception e) {
            logger.error("Failed to seed users from JSON", e);
        }
    }

    private void createUserIfNotExists(String email, String password, String fullName, RoleName roleName) {
        transactionTemplate.executeWithoutResult(status -> {
            Optional<User> existingUserOpt = userRepository.findByEmailIgnoreCase(email);
            User user;

            if (existingUserOpt.isPresent()) {
                user = existingUserOpt.get();
                user.setPassword(passwordEncoder.encode(password));
                user.setStatus(UserStatus.ACTIVE);
                if (user.getAuthProvider() == null) {
                    user.setAuthProvider(AuthProvider.LOCAL);
                }
                user = userRepository.saveAndFlush(user);
                assignRoleIfMissing(user, roleName);
                logger.info("Updated existing {} user '{}' password from env configuration.",
                        roleName.name(), email);
                return;
            }

            user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setFullName(fullName);
            user.setAuthProvider(AuthProvider.LOCAL);
            user.setStatus(UserStatus.ACTIVE);
            user = userRepository.saveAndFlush(user);
            assignRoleIfMissing(user, roleName);
            logger.info("Seeded {} user: {}", roleName.name(), email);
        });
    }

    private void assignRoleIfMissing(User user, RoleName roleName) {
        if (user == null || user.getId() == null) {
            throw new IllegalStateException("Cannot assign role without persisted user id");
        }
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException(roleName.name() + " role not found"));

        Integer existing = jdbcTemplate.queryForObject("""
                SELECT count(1)
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = ? AND r.name = ?
                """, Integer.class, user.getId(), roleName.name());
        if (existing != null && existing > 0) {
            return;
        }

        UserRole userRole = new UserRole();
        userRole.setUser(userRepository.getReferenceById(user.getId()));
        userRole.setRole(role);
        userRoleRepository.save(userRole);
    }

    private void healUserSchemaColumns() {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN NOT NULL DEFAULT FALSE");
            jdbcTemplate.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_score INTEGER NOT NULL DEFAULT 0");
        } catch (Exception e) {
            logger.warn("users schema self-heal skipped: {}", e.getMessage());
        }
    }

    private void seedSeatTypes() {
        List<Map<String, Object>> seatTypesToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/seat_types.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    seatTypesToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load seat_types.json", e);
        }

        if (seatTypesToSeed != null) {
            for (Map<String, Object> data : seatTypesToSeed) {
                String uuidStr = (String) data.get("uuid");
                String name = (String) data.get("name");
                Object basePriceObj = data.get("basePrice");
                Object priceModifierObj = data.get("priceModifier");

                if (uuidStr == null || name == null || basePriceObj == null) {
                    continue;
                }

                UUID uuid = UUID.fromString(uuidStr);
                BigDecimal basePrice = new BigDecimal(basePriceObj.toString());
                BigDecimal priceModifier = priceModifierObj != null ? new BigDecimal(priceModifierObj.toString())
                        : BigDecimal.ONE;

                if (jdbcTemplate.queryForObject("SELECT count(1) FROM seat_type WHERE uuid = ?", Integer.class,
                        uuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO seat_type (uuid, name, base_price, price_modifier) VALUES (?, ?, ?, ?)",
                            uuid, name, basePrice, priceModifier);
                    logger.info("Seeded seat type from JSON: {}", name);
                }
            }
        }
    }

    private void seedActors() {
        List<Map<String, String>> actorsToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/actors.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    actorsToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, String>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load actors.json", e);
        }

        if (actorsToSeed != null) {
            for (Map<String, String> actorData : actorsToSeed) {
                String fullName = actorData.get("fullName");
                String avatarUrl = actorData.get("avatarUrl");
                String countryName = actorData.get("countryName");
                String uuidStr = actorData.get("uuid");

                if (fullName == null)
                    continue;

                boolean exists = actorRepository.existsByFullNameIgnoreCase(fullName);

                if (!exists) {
                    Actor actor = new Actor();
                    actor.setFullName(fullName);
                    actor.setAvatarUrl(avatarUrl);
                    if (countryName != null) {
                        Country country = countryRepository.findByNameIgnoreCase(countryName)
                                .orElse(null);
                        actor.setCountry(country);
                    }
                    actorRepository.save(actor);
                    logger.info("Seeded actor from JSON: {}", fullName);
                }
            }
        }
    }

    private void seedMovies() {
        removeObsoleteComingSoonMovies();

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

        List<MovieJsonData> moviesToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/movies.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    moviesToSeed = objectMapper.readValue(is, new TypeReference<List<MovieJsonData>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load movies.json", e);
        }

        if (moviesToSeed != null && !moviesToSeed.isEmpty()) {
            for (MovieJsonData movieData : moviesToSeed) {
                boolean exists = movieRepository.existsByTitleIgnoreCase(movieData.title);

                // if (exists) {
                // continue;
                // }

                if (exists) {
                    Movie movie = movieRepository.findByTitleIgnoreCase(movieData.title).orElse(null);
                    if (movie != null) {
                        // Cập nhật streamingUrl
                        movie.setStreamingUrl(movieData.streamingUrl);

                        // Cập nhật trailer trong medias
                        if (movieData.medias != null) {
                            for (MediaJsonData mediaData : movieData.medias) {
                                if ("TRAILER".equals(mediaData.mediaType)) {
                                    boolean hasTrailer = false;
                                    if (movie.getMovieMedias() != null) {
                                        for (MovieMedia mm : movie.getMovieMedias()) {
                                            if ("TRAILER".equals(mm.getMediaType())) {
                                                mm.setMediaUrl(mediaData.mediaUrl);
                                                hasTrailer = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (!hasTrailer) {
                                        MovieMedia media = new MovieMedia();
                                        media.setMovie(movie);
                                        media.setMediaUrl(mediaData.mediaUrl);
                                        media.setMediaType(mediaData.mediaType);
                                        media.setTitle(mediaData.title);
                                        media.setIsPrimary(mediaData.isPrimary != null ? mediaData.isPrimary : false);
                                        media.setSortOrder(mediaData.sortOrder != null ? mediaData.sortOrder : 0);
                                        movie.addMovieMedia(media);
                                    }
                                }
                            }
                        }
                        movieRepository.save(movie);
                        logger.info("Updated existing movie '{}' with streamingUrl and trailer from JSON.",
                                movie.getTitle());
                    }
                    continue;
                }

                Movie movie = new Movie();
                movie.setTitle(movieData.title);
                movie.setDescription(movieData.description);
                movie.setDurationMinutes(movieData.durationMinutes != null ? movieData.durationMinutes : 120);

                LocalDate releaseDate = LocalDate.now();
                if (movieData.releaseDate != null) {
                    try {
                        releaseDate = LocalDate.parse(movieData.releaseDate);
                    } catch (Exception e) {
                        logger.error("Invalid release date '{}' for movie '{}'", movieData.releaseDate,
                                movieData.title);
                    }
                }
                movie.setReleaseDate(releaseDate);
                movie.setStatus(movieData.status != null ? movieData.status : "NOW_SHOWING");
                movie.setAgeRestriction(movieData.ageRating != null ? movieData.ageRating : "P");
                movie.setOnlinePrice(movieData.onlinePrice != null ? movieData.onlinePrice : BigDecimal.valueOf(45000));
                movie.setRating(movieData.rating != null ? movieData.rating : 8.0);

                // Add Genres
                if (movieData.genres != null) {
                    for (String genreName : movieData.genres) {
                        Genre genre = genreRepository.findByNameIgnoreCase(genreName)
                                .orElseGet(() -> {
                                    Genre g = new Genre();
                                    g.setName(genreName);
                                    return genreRepository.save(g);
                                });
                        MovieGenre movieGenre = new MovieGenre();
                        movieGenre.setMovie(movie);
                        movieGenre.setGenre(genre);
                        movie.addMovieGenre(movieGenre);
                    }
                }

                // Add Countries
                if (movieData.countries != null) {
                    for (String countryName : movieData.countries) {
                        Country country = countryRepository.findByNameIgnoreCase(countryName)
                                .orElseGet(() -> {
                                    Optional<Country> opt = countryRepository.findByCodeIgnoreCase(countryName);
                                    if (opt.isPresent())
                                        return opt.get();

                                    String code = countryName.substring(0, Math.min(2, countryName.length()))
                                            .toUpperCase();

                                    // Special handling for "Khác" -> "XX" to avoid collision with Cambodia (KH)
                                    if ("KHÁC".equalsIgnoreCase(countryName) || "KHAC".equalsIgnoreCase(countryName)
                                            || countryName.startsWith("Kh")) {
                                        code = "XX";
                                    }

                                    // Handle general collisions
                                    if (countryRepository.existsByCodeIgnoreCase(code)) {
                                        if ("XX".equals(code)) {
                                            code = "ZZ";
                                        } else {
                                            boolean foundUnique = false;
                                            for (char c1 = 'A'; c1 <= 'Z'; c1++) {
                                                for (char c2 = 'A'; c2 <= 'Z'; c2++) {
                                                    String testCode = "" + c1 + c2;
                                                    if (!countryRepository.existsByCodeIgnoreCase(testCode)) {
                                                        code = testCode;
                                                        foundUnique = true;
                                                        break;
                                                    }
                                                }
                                                if (foundUnique) {
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    Country c = new Country();
                                    c.setCode(code);
                                    c.setName(countryName);
                                    return countryRepository.save(c);
                                });
                        MovieCountry movieCountry = new MovieCountry();
                        movieCountry.setMovie(movie);
                        movieCountry.setCountry(country);
                        movie.addMovieCountry(movieCountry);
                    }
                }

                // Add Medias
                if (movieData.medias != null) {
                    for (MediaJsonData mediaData : movieData.medias) {
                        MovieMedia media = new MovieMedia();
                        media.setMovie(movie);
                        media.setMediaUrl(mediaData.mediaUrl);
                        media.setMediaType(mediaData.mediaType);
                        media.setTitle(mediaData.title);
                        media.setIsPrimary(mediaData.isPrimary != null ? mediaData.isPrimary : false);
                        media.setSortOrder(mediaData.sortOrder != null ? mediaData.sortOrder : 0);
                        movie.addMovieMedia(media);
                    }
                }

                // Add Actors
                if (movieData.actors != null) {
                    for (ActorJsonData actorData : movieData.actors) {
                        Actor actor = actorRepository.findByFullNameIgnoreCase(actorData.fullName)
                                .orElseGet(() -> {
                                    Actor newActor = new Actor();
                                    newActor.setFullName(actorData.fullName);
                                    newActor.setAvatarUrl(actorData.avatarUrl);
                                    if (actorData.countryName != null) {
                                        Country country = countryRepository.findByNameIgnoreCase(actorData.countryName)
                                                .orElse(null);
                                        newActor.setCountry(country);
                                    }
                                    return actorRepository.save(newActor);
                                });
                        MovieActor movieActor = new MovieActor();
                        movieActor.setMovie(movie);
                        movieActor.setActor(actor);
                        movieActor.setCharacterName(actorData.characterName);
                        movieActor.setCastOrder(actorData.castOrder != null ? actorData.castOrder : 0);
                        movieActor.setIsMain(actorData.isMain != null ? actorData.isMain : false);
                        movie.addMovieActor(movieActor);
                    }
                }

                movieRepository.save(movie);
                logger.info("Seeded movie from JSON: {}", movie.getTitle());
            }
        }

        // Self-healing: đồng bộ streaming_url từ TRAILER cho phim online chưa có link
        // phát
        try {
            int synced = jdbcTemplate.update("""
                        UPDATE movie m
                        SET streaming_url = src.media_url
                        FROM (
                            SELECT DISTINCT ON (mm.movie_uuid) mm.movie_uuid, mm.media_url
                            FROM movie_media mm
                            WHERE mm.media_type = 'TRAILER'
                              AND mm.media_url IS NOT NULL
                              AND btrim(mm.media_url) <> ''
                            ORDER BY mm.movie_uuid, mm.sort_order NULLS LAST
                        ) src
                        WHERE m.uuid = src.movie_uuid
                          AND (m.streaming_url IS NULL OR btrim(m.streaming_url) = '')
                          AND m.screening_mode IN ('BOTH', 'ONLINE_ONLY')
                    """);
            if (synced > 0) {
                logger.info("Synced streaming_url from TRAILER media for {} online movies", synced);
            }
        } catch (Exception e) {
            logger.warn("Failed to sync streaming_url from trailer media", e);
        }

        // Self-healing: đồng bộ trạng thái phim theo ngày công chiếu
        try {
            LocalDate today = LocalDate.now();
            int toComingSoon = jdbcTemplate.update(
                    "UPDATE movie SET status = 'COMING_SOON' WHERE release_date > ? AND status IN ('NOW_SHOWING', 'DRAFT')",
                    today);
            int toNowShowing = jdbcTemplate.update(
                    "UPDATE movie SET status = 'NOW_SHOWING' WHERE release_date <= ? AND status = 'COMING_SOON'",
                    today);
            if (toComingSoon > 0 || toNowShowing > 0) {
                logger.info("Synced movie status by release date: {} -> COMING_SOON, {} -> NOW_SHOWING",
                        toComingSoon, toNowShowing);
            }
        } catch (Exception e) {
            logger.error("Failed to sync movie status by release date", e);
        }

        // Self-healing: Cập nhật rating cho các phim đã tồn tại nếu rating là null
        try {
            jdbcTemplate.update("UPDATE movie SET rating = 8.0 WHERE rating IS NULL");
            logger.info("Successfully self-healed ratings for existing movies.");
        } catch (Exception e) {
            logger.error("Failed to self-heal ratings", e);
        }
    }

    private void removeObsoleteComingSoonMovies() {
        String[] titles = {
                "Đường Đua Nghẹt Thở",
                "PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI)",
                "Hiệp Sĩ Mặt Nạ Zeztz - Kamen Rider Zeztz",
                "Ma Xó 2: Hồi Sinh"
        };

        try {
            for (String title : titles) {
                List<UUID> movieUuids = jdbcTemplate.query(
                        "SELECT uuid FROM movie WHERE LOWER(title) = LOWER(?)",
                        (rs, rowNum) -> rs.getObject("uuid", UUID.class),
                        title);

                for (UUID movieUuid : movieUuids) {
                    jdbcTemplate.update(
                            "DELETE FROM seat_locked WHERE showtime_uuid IN (SELECT uuid FROM showtime WHERE movie_uuid = ?)",
                            movieUuid);
                    jdbcTemplate.update("DELETE FROM booking_seat WHERE booking_uuid IN "
                            + "(SELECT uuid FROM booking WHERE showtime_uuid IN "
                            + "(SELECT uuid FROM showtime WHERE movie_uuid = ?))", movieUuid);
                    jdbcTemplate.update("DELETE FROM booking_combo WHERE booking_uuid IN "
                            + "(SELECT uuid FROM booking WHERE showtime_uuid IN "
                            + "(SELECT uuid FROM showtime WHERE movie_uuid = ?))", movieUuid);
                    jdbcTemplate.update("DELETE FROM ticket WHERE booking_uuid IN "
                            + "(SELECT uuid FROM booking WHERE showtime_uuid IN "
                            + "(SELECT uuid FROM showtime WHERE movie_uuid = ?))", movieUuid);
                    jdbcTemplate.update("DELETE FROM booking WHERE showtime_uuid IN "
                            + "(SELECT uuid FROM booking WHERE showtime_uuid IN "
                            + "(SELECT uuid FROM showtime WHERE movie_uuid = ?))", movieUuid);
                    jdbcTemplate.update("DELETE FROM showtime WHERE movie_uuid = ?", movieUuid);
                    jdbcTemplate.update("DELETE FROM movie_media WHERE movie_uuid = ?", movieUuid);
                    jdbcTemplate.update("DELETE FROM movie_genre WHERE movie_uuid = ?", movieUuid);
                    jdbcTemplate.update("DELETE FROM movie_country WHERE movie_uuid = ?", movieUuid);
                    jdbcTemplate.update("DELETE FROM movie_actor WHERE movie_uuid = ?", movieUuid);
                    jdbcTemplate.update("DELETE FROM movie WHERE uuid = ?", movieUuid);
                    logger.info("Removed obsolete coming soon movie: {}", title);
                }
            }
        } catch (Exception e) {
            logger.error("Failed to remove obsolete coming soon movies", e);
        }
    }

    private void seedCinemasAndRooms() {
        // Clean up legacy random-UUID and duplicate cinemas to ensure clean state
        try {
            jdbcTemplate.update("""
                        DELETE FROM seat
                        WHERE cinema_room_uuid IN (
                            SELECT uuid FROM cinema_room
                            WHERE cinema_uuid IN (
                                SELECT uuid FROM cinema
                                WHERE uuid <> '77777777-7777-7777-7777-777777777777'
                                  AND name IN ('NASA Landmark 81', 'NASA Landmark 81 JDBC')
                            )
                        )
                    """);
            jdbcTemplate.update("""
                        DELETE FROM cinema_room
                        WHERE cinema_uuid IN (
                            SELECT uuid FROM cinema
                            WHERE uuid <> '77777777-7777-7777-7777-777777777777'
                                  AND name IN ('NASA Landmark 81', 'NASA Landmark 81 JDBC')
                            )
                        )
                    """);
            jdbcTemplate.update(
                    "DELETE FROM cinema WHERE uuid <> '77777777-7777-7777-7777-777777777777' AND name IN ('NASA Landmark 81', 'NASA Landmark 81 JDBC')");

            // Rename legacy names and types if they already exist with the fixed UUIDs
            jdbcTemplate.update(
                    "UPDATE cinema SET name = 'NASA Landmark 81' WHERE uuid = '77777777-7777-7777-7777-777777777777'");
            jdbcTemplate.update(
                    "UPDATE cinema_room SET room_code = 'ROOM-IMAX', name = 'Phòng chiếu IMAX' WHERE uuid = '88888888-8888-8888-8888-888888888888'");
            jdbcTemplate.update(
                    "UPDATE cinema_room SET room_code = 'ROOM-VIP', name = 'Phòng chiếu VIP' WHERE uuid = '99999999-9999-9999-9999-999999999999'");

            // Migrate seat types standard/vip/couple
            jdbcTemplate.update("""
                        UPDATE seat
                        SET seat_type_uuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
                        FROM seat_type
                        WHERE seat.seat_type_uuid = seat_type.uuid
                          AND seat_type.name IN ('Ghế Thường', 'STANDARD')
                          AND seat.seat_type_uuid <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
                    """);
            jdbcTemplate.update("""
                        UPDATE seat
                        SET seat_type_uuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
                        FROM seat_type
                        WHERE seat.seat_type_uuid = seat_type.uuid
                          AND seat_type.name IN ('Ghế VIP', 'VIP')
                          AND seat.seat_type_uuid <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
                    """);
            jdbcTemplate.update("""
                        UPDATE seat
                        SET seat_type_uuid = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
                        FROM seat_type
                        WHERE seat.seat_type_uuid = seat_type.uuid
                          AND seat_type.name IN ('Ghế Đôi', 'COUPLE')
                          AND seat.seat_type_uuid <> 'cccccccc-cccc-cccc-cccc-cccccccccccc'
                    """);

            jdbcTemplate.update("""
                        DELETE FROM seat_type
                        WHERE uuid NOT IN (
                            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                            'cccccccc-cccc-cccc-cccc-cccccccccccc'
                        )
                    """);

            // Self-healing: Update capacity of rooms to their actual active seat count if
            // capacity <= 0
            jdbcTemplate
                    .update("""
                                UPDATE cinema_room cr
                                SET capacity = (SELECT COUNT(1) FROM seat s WHERE s.cinema_room_uuid = cr.uuid AND s.is_active = true)
                                WHERE cr.capacity <= 0 OR cr.capacity IS NULL
                            """);

            // Self-healing: Restore showtimes marked SOLD_OUT back to OPEN_FOR_BOOKING if
            // booked seats < room capacity
            jdbcTemplate.update("""
                        UPDATE showtime st
                        SET status = 'OPEN_FOR_BOOKING'
                        WHERE st.status = 'SOLD_OUT'
                          AND (
                              SELECT COUNT(1) FROM booking_seat bs WHERE bs.showtime_uuid = st.uuid
                          ) < (
                              SELECT cr.capacity FROM cinema_room cr WHERE cr.uuid = st.cinema_room_uuid
                          )
                    """);
        } catch (Exception e) {
            logger.warn("Could not clean up, rename, or heal legacy cinema/showtime records: {}", e.getMessage());
        }

        List<CinemaJsonData> cinemasToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/cinemas.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    cinemasToSeed = objectMapper.readValue(is, new TypeReference<List<CinemaJsonData>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load cinemas.json", e);
        }

        if (cinemasToSeed != null) {
            for (CinemaJsonData cinemaData : cinemasToSeed) {
                UUID cinemaUuid = cinemaData.uuid != null ? UUID.fromString(cinemaData.uuid) : UUID.randomUUID();
                if (jdbcTemplate.queryForObject("SELECT count(1) FROM cinema WHERE uuid = ?", Integer.class,
                        cinemaUuid) == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO cinema (uuid, name, address, phone_number, entrance_note, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            cinemaUuid, cinemaData.name, cinemaData.address, cinemaData.phoneNumber,
                            cinemaData.entranceNote, cinemaData.latitude, cinemaData.longitude);
                    logger.info("Seeded cinema from JSON: {}", cinemaData.name);
                } else if (cinemaData.entranceNote != null || cinemaData.latitude != null || cinemaData.longitude != null) {
                    jdbcTemplate.update(
                            "UPDATE cinema SET entrance_note = COALESCE(?, entrance_note), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude) WHERE uuid = ?",
                            cinemaData.entranceNote, cinemaData.latitude, cinemaData.longitude, cinemaUuid);
                }

                if (cinemaData.rooms != null) {
                    for (RoomJsonData roomData : cinemaData.rooms) {
                        UUID roomUuid = roomData.uuid != null ? UUID.fromString(roomData.uuid) : UUID.randomUUID();
                        if (jdbcTemplate.queryForObject("SELECT count(1) FROM cinema_room WHERE uuid = ?",
                                Integer.class, roomUuid) == 0) {
                            jdbcTemplate.update(
                                    "INSERT INTO cinema_room (uuid, room_code, name, capacity, room_type, status, cinema_uuid) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                    roomUuid, roomData.roomCode, roomData.name, 0, roomData.roomType, roomData.status,
                                    cinemaUuid);
                            cinemaService.generateSeats(roomUuid, null);
                            logger.info("Seeded room from JSON and generated seats: {}", roomData.roomCode);
                        }
                    }
                }
            }
        }
    }

    private void seedCombos() {
        List<Map<String, Object>> combosToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/combos.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    combosToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load combos.json", e);
        }

        if (combosToSeed != null) {
            for (Map<String, Object> comboData : combosToSeed) {
                String uuidStr = (String) comboData.get("uuid");
                String name = (String) comboData.get("name");
                Object priceObj = comboData.get("price");
                String status = (String) comboData.get("status");

                if (uuidStr == null || name == null || priceObj == null) {
                    continue;
                }

                UUID uuid = UUID.fromString(uuidStr);
                BigDecimal price = new BigDecimal(priceObj.toString());
                if (jdbcTemplate.queryForObject("SELECT count(1) FROM combo WHERE uuid = ?", Integer.class,
                        uuid) == 0) {
                    jdbcTemplate.update("INSERT INTO combo (uuid, name, price, status) VALUES (?, ?, ?, ?)",
                            uuid, name, price, status != null ? status : "ACTIVE");
                    logger.info("Seeded combo from JSON: {}", name);
                }
            }
        }
    }

    private void seedPromotions() {
        List<Map<String, Object>> promotionsToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/promotions.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    promotionsToSeed = objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load promotions.json", e);
        }

        OffsetDateTime now = OffsetDateTime.now();

        if (promotionsToSeed != null) {
            for (Map<String, Object> promoData : promotionsToSeed) {
                String uuidStr = (String) promoData.get("uuid");
                String code = (String) promoData.get("code");
                Object discountValueObj = promoData.get("discountValue");
                String discountType = (String) promoData.get("discountType");
                Object maxUsageObj = promoData.get("maxUsage");
                Boolean oncePerUser = (Boolean) promoData.get("oncePerUser");
                String status = (String) promoData.get("status");

                if (uuidStr == null || code == null || discountValueObj == null || discountType == null) {
                    continue;
                }

                UUID uuid = UUID.fromString(uuidStr);
                BigDecimal discountValue = new BigDecimal(discountValueObj.toString());
                int maxUsage = maxUsageObj != null ? ((Number) maxUsageObj).intValue() : 100;

                if (jdbcTemplate.queryForObject("SELECT count(1) FROM promotions WHERE uuid = ?", Integer.class,
                        uuid) == 0) {
                    jdbcTemplate.update(
                            """
                                        INSERT INTO promotions (uuid, code, discount_value, discount_type, max_usage, used_count, once_per_user, start_date, end_date, status, created_at, updated_at)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    """,
                            uuid, code, discountValue, discountType, maxUsage, 0,
                            oncePerUser != null ? oncePerUser : false,
                            now.minusDays(1), now.plusDays(30), status != null ? status : "ACTIVE", now, now);
                    logger.info("Seeded promotion from JSON: {}", code);
                }
            }
        }
    }

    private void seedShowtimes() {
        List<ShowtimeJsonData> showtimesToSeed = null;
        try {
            Resource resource = resourceLoader.getResource("classpath:data/showtimes.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    showtimesToSeed = objectMapper.readValue(is, new TypeReference<List<ShowtimeJsonData>>() {
                    });
                }
            }
        } catch (Exception e) {
            logger.error("Failed to load showtimes.json", e);
        }

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime baseDay = now.plusDays(1);

        if (showtimesToSeed != null) {
            for (ShowtimeJsonData data : showtimesToSeed) {
                if (data.uuid == null || data.movieTitle == null || data.roomCode == null) {
                    continue;
                }

                UUID showtimeUuid = UUID.fromString(data.uuid);

                List<Movie> matchedMovies = movieRepository.findAll().stream()
                        .filter(m -> m.getTitle().equalsIgnoreCase(data.movieTitle))
                        .toList();
                if (matchedMovies.isEmpty()) {
                    logger.warn("Showtime movie title '{}' not found in database. Skipping showtime: {}",
                            data.movieTitle, showtimeUuid);
                    continue;
                }
                UUID movieUuid = matchedMovies.get(0).getUuid();

                List<UUID> roomUuids = jdbcTemplate.query(
                        "SELECT uuid FROM cinema_room WHERE LOWER(room_code) = LOWER(?)",
                        (rs, rowNum) -> rs.getObject("uuid", UUID.class),
                        data.roomCode);
                if (roomUuids.isEmpty()) {
                    logger.warn("Showtime room code '{}' not found in database. Skipping showtime: {}", data.roomCode,
                            showtimeUuid);
                    continue;
                }
                UUID roomUuid = roomUuids.get(0);

                if (jdbcTemplate.queryForObject("SELECT count(1) FROM showtime WHERE uuid = ?", Integer.class,
                        showtimeUuid) == 0) {
                    int startH = data.startHour != null ? data.startHour : 19;
                    int startM = data.startMinute != null ? data.startMinute : 30;
                    int endH = data.endHour != null ? data.endHour : 21;
                    int endM = data.endMinute != null ? data.endMinute : 30;
                    BigDecimal basePrice = data.basePrice != null ? data.basePrice : BigDecimal.valueOf(80000);
                    String status = data.status != null ? data.status : "OPEN_FOR_BOOKING";

                    jdbcTemplate.update(
                            "INSERT INTO showtime (uuid, movie_uuid, cinema_room_uuid, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            showtimeUuid, movieUuid, roomUuid,
                            baseDay.withHour(startH).withMinute(startM).withSecond(0).withNano(0),
                            baseDay.withHour(endH).withMinute(endM).withSecond(0).withNano(0),
                            basePrice, status);
                    logger.info("Seeded showtime from JSON: {}", showtimeUuid);
                }
            }
        }
    }

    private void repairOrphanBookingSeats() {
        try {
            logger.info("=== RUNNING ORPHAN BOOKING SEATS REPAIR ===");
            List<Map<String, Object>> orphans = jdbcTemplate.queryForList("""
                        select bs.uuid as bs_uuid, bs.showtime_uuid, bs.seat_uuid
                        from booking_seat bs
                        left join seat s on s.uuid = bs.seat_uuid
                        where s.uuid is null
                    """);

            if (orphans.isEmpty()) {
                logger.info("No orphan booking seats found.");
                return;
            }

            logger.info("Found {} orphan booking seats. Repairing...", orphans.size());

            for (Map<String, Object> orphan : orphans) {
                UUID bsUuid = (UUID) orphan.get("bs_uuid");
                UUID showtimeUuid = (UUID) orphan.get("showtime_uuid");

                List<UUID> roomUuids = jdbcTemplate.query(
                        "select cinema_room_uuid from showtime where uuid = ?",
                        (rs, rowNum) -> (UUID) rs.getObject("cinema_room_uuid"),
                        showtimeUuid);

                if (roomUuids.isEmpty()) {
                    continue;
                }
                UUID roomUuid = roomUuids.get(0);

                List<UUID> validSeats = jdbcTemplate.query(
                        "select uuid from seat where cinema_room_uuid = ? order by row_name asc, seat_number asc",
                        (rs, rowNum) -> (UUID) rs.getObject("uuid"),
                        roomUuid);

                if (validSeats.isEmpty()) {
                    continue;
                }

                List<UUID> assignedSeats = jdbcTemplate.query(
                        "select seat_uuid from booking_seat where showtime_uuid = ?",
                        (rs, rowNum) -> (UUID) rs.getObject("seat_uuid"),
                        showtimeUuid);

                UUID chosenSeat = null;
                for (UUID seatUuid : validSeats) {
                    if (!assignedSeats.contains(seatUuid)) {
                        chosenSeat = seatUuid;
                        break;
                    }
                }

                if (chosenSeat == null) {
                    chosenSeat = validSeats.get(0);
                }

                jdbcTemplate.update(
                        "update booking_seat set seat_uuid = ? where uuid = ?",
                        chosenSeat, bsUuid);
                logger.info("Repaired booking_seat {} to point to seat {}", bsUuid, chosenSeat);
            }
            logger.info("=== REPAIR COMPLETE ===");
        } catch (Exception e) {
            logger.error("Failed to repair orphan booking seats: {}", e.getMessage());
        }
    }

    private static class MovieJsonData {
        public String uuid;
        public String title;
        public String description;
        public Integer durationMinutes;
        public String releaseDate;
        public String status;
        public String ageRating;
        public List<String> genres;
        public List<String> countries;
        public List<ActorJsonData> actors;
        public List<MediaJsonData> medias;
        public String streamingUrl;
        public Double rating;
        public BigDecimal onlinePrice;
    }

    private static class ActorJsonData {
        public String uuid;
        public String fullName;
        public String avatarUrl;
        public String countryName;
        public String characterName;
        public Integer castOrder;
        public Boolean isMain;
    }

    private static class MediaJsonData {
        public String uuid;
        public String mediaUrl;
        public String mediaType;
        public String title;
        public Boolean isPrimary;
        public Integer sortOrder;
    }

    private static class CinemaJsonData {
        public String uuid;
        public String name;
        public String address;
        public String phoneNumber;
        public String entranceNote;
        public Double latitude;
        public Double longitude;
        public List<RoomJsonData> rooms;
    }

    private static class RoomJsonData {
        public String uuid;
        public String roomCode;
        public String name;
        public String roomType;
        public String status;
    }

    private static class ShowtimeJsonData {
        public String uuid;
        public String movieTitle;
        public String roomCode;
        public Integer startHour;
        public Integer startMinute;
        public Integer endHour;
        public Integer endMinute;
        public BigDecimal basePrice;
        public String status;
    }
}
