package com.thdpv.movietheater;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Manual/local integration checks requiring a configured database")
class MovieTheaterBackendApplicationTests {

	static {
		try {
			java.nio.file.Path path = java.nio.file.Paths.get(".env");
			if (java.nio.file.Files.exists(path)) {
				java.util.List<String> lines = java.nio.file.Files.readAllLines(path);
				for (String line : lines) {
					line = line.trim();
					if (line.isEmpty() || line.startsWith("#")) {
						continue;
					}
					int eqIdx = line.indexOf('=');
					if (eqIdx > 0) {
						String key = line.substring(0, eqIdx).trim();
						String value = line.substring(eqIdx + 1).trim();
						if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						} else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						}
						System.setProperty(key, value);
					}
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	@org.springframework.beans.factory.annotation.Autowired
	private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

	@Test
	void contextLoads() {
	}

	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.booking.repository.ShowtimeRepository showtimeRepository;

	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.booking.service.BookingService bookingService;

	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.booking.service.ShowtimeSeatService showtimeSeatService;

	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.cinema.service.CinemaService cinemaService;

	@Test
	void printSeatLocks() {
		java.util.List<java.util.Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM seat_locked");
		System.out.println("--- SEAT LOCKS IN DB ---");
		for (java.util.Map<String, Object> row : rows) {
			System.out.println(row);
		}
		System.out.println("------------------------");

		java.util.Map<String, Object> tz = jdbcTemplate.queryForMap("SELECT now() as db_now, current_setting('TIMEZONE') as db_tz");
		System.out.println("--- TIMEZONE INFO ---");
		System.out.println("Java OffsetDateTime.now(): " + java.time.OffsetDateTime.now());
		System.out.println("Database now() and tz: " + tz);

		if (!rows.isEmpty()) {
			java.util.UUID stUuid = (java.util.UUID) rows.get(0).get("showtime_uuid");
			System.out.println("Querying showtime seat views for showtime: " + stUuid);
			java.util.List<com.thdpv.movietheater.booking.dto.response.SeatViewDto> views = 
				showtimeRepository.getShowtimeSeatViews(stUuid, java.time.OffsetDateTime.now());
			int lockedCount = 0;
			for (com.thdpv.movietheater.booking.dto.response.SeatViewDto view : views) {
				if (view.getLockedUserUuid() != null) {
					System.out.println("Found locked seat: " + view.getSeatNumber() + " row: " + view.getRowName() 
						+ " by: " + view.getLockedUserUuid() + " expiredAt: " + view.getLockedUntil());
					lockedCount++;
				}
			}
			System.out.println("Total locked seats found in JPQL: " + lockedCount);
		}
		System.out.println("------------------------");
	}

	@Test
	void testConfirmBooking() {
		try {
			// Find a seat and showtime to lock
			java.util.UUID showtimeUuid = java.util.UUID.fromString("11111111-1111-1111-1111-111111111111");
			java.util.List<java.util.Map<String, Object>> seats = jdbcTemplate.queryForList(
				"SELECT s.uuid FROM seat s JOIN showtime st ON s.cinema_room_uuid = st.cinema_room_uuid WHERE st.uuid = ? LIMIT 1",
				showtimeUuid
			);
			if (seats.isEmpty()) {
				System.out.println("No seats found for showtime!");
				return;
			}
			java.util.UUID seatUuid = (java.util.UUID) seats.get(0).get("uuid");
			System.out.println("Using seat: " + seatUuid);

			// Lock the seat
			showtimeSeatService.syncSeatLocks("customer@example.com", new com.thdpv.movietheater.booking.dto.request.SyncSeatLockRequest(
				showtimeUuid, java.util.List.of(seatUuid)
			));
			System.out.println("Seat locked successfully!");

			// Confirm booking
			com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest req = 
				new com.thdpv.movietheater.booking.dto.request.ConfirmBookingRequest();
			req.setShowtimeUuid(showtimeUuid);
			req.setSeatUuids(java.util.List.of(seatUuid));
			req.setCombos(java.util.List.of());

			bookingService.confirmBooking("customer@example.com", req);
			System.out.println("Booking confirmed successfully!");
		} catch (Exception e) {
			System.out.println("--- CONFIRM BOOKING FAILED ---");
			e.printStackTrace();
			if (e.getCause() != null) {
				System.out.println("Cause: " + e.getCause().getMessage());
				e.getCause().printStackTrace();
			}
			System.out.println("------------------------------");
		}
	}

	@Test
	void checkData() {
		System.out.println("=== CINEMAS ===");
		jdbcTemplate.queryForList("SELECT uuid, name FROM cinema").forEach(System.out::println);
		System.out.println("=== CINEMA ROOMS ===");
		jdbcTemplate.queryForList("SELECT uuid, name, cinema_uuid, room_code FROM cinema_room").forEach(System.out::println);
		System.out.println("=== SHOWTIMES ===");
		jdbcTemplate.queryForList("SELECT uuid, cinema_room_uuid, start_time, movie_uuid FROM showtime").forEach(System.out::println);
		System.out.println("=== SEATS COUNT BY ROOM ===");
		jdbcTemplate.queryForList("SELECT cinema_room_uuid, count(1) FROM seat GROUP BY cinema_room_uuid").forEach(System.out::println);
	}

	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.cinema.repository.CinemaRepository cinemaRepository;
	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.cinema.repository.CinemaRoomRepository cinemaRoomRepository;
	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.movie.repository.MovieRepository movieRepository;
	@org.springframework.beans.factory.annotation.Autowired
	private com.thdpv.movietheater.user.repository.UserRepository userRepository;

	@Test
	@org.springframework.transaction.annotation.Transactional
	void testNewRoomAndShowtimeSeatMap() {
		// 0. Create a unique user
		com.thdpv.movietheater.user.entity.User testUser = new com.thdpv.movietheater.user.entity.User();
		testUser.setEmail("test-user-unique@example.com");
		testUser.setPassword("123123");
		testUser.setFullName("Test User Unique");
		testUser.setAuthProvider(com.thdpv.movietheater.user.enums.AuthProvider.LOCAL);
		testUser.setStatus(com.thdpv.movietheater.user.enums.UserStatus.ACTIVE);
		userRepository.save(testUser);

		// 1. Create a cinema
		com.thdpv.movietheater.cinema.entity.Cinema cinema = new com.thdpv.movietheater.cinema.entity.Cinema();
		cinema.setName("NASA Test Cinema");
		cinema.setAddress("Test Address");
		cinema.setPhoneNumber("123456");
		cinema = cinemaRepository.save(cinema);

		// 2. Create a room
		com.thdpv.movietheater.cinema.entity.CinemaRoom room = new com.thdpv.movietheater.cinema.entity.CinemaRoom();
		room.setCinema(cinema);
		room.setRoomCode("TEST-ROOM");
		room.setName("Test Room 1");
		room.setCapacity(96);
		room.setRoomType(com.thdpv.movietheater.cinema.enums.RoomType.STANDARD);
		room.setStatus(com.thdpv.movietheater.cinema.enums.CinemaRoomStatus.ACTIVE);
		room = cinemaRoomRepository.save(room);
		cinemaService.generateSeats(room.getUuid(), null);

		// 3. Create a movie (or use an existing one)
		java.util.List<com.thdpv.movietheater.movie.entity.Movie> movies = movieRepository.findAll();
		org.junit.jupiter.api.Assertions.assertFalse(movies.isEmpty(), "No movies in DB");
		java.util.UUID movieUuid = movies.get(0).getUuid();

		// 4. Create a showtime
		com.thdpv.movietheater.booking.entity.Showtime showtime = new com.thdpv.movietheater.booking.entity.Showtime();
		showtime.setMovieUuid(movieUuid);
		showtime.setCinemaRoomUuid(room.getUuid());
		showtime.setStartTime(java.time.OffsetDateTime.now().plusDays(1));
		showtime.setEndTime(java.time.OffsetDateTime.now().plusDays(1).plusHours(2));
		showtime.setBasePrice(java.math.BigDecimal.valueOf(80000));
		showtime.setStatus(com.thdpv.movietheater.booking.enums.ShowtimeStatus.OPEN_FOR_BOOKING);
		showtime = showtimeRepository.save(showtime);

		// 5. Fetch seat map
		com.thdpv.movietheater.booking.dto.response.ShowtimeSeatMapResponse response = showtimeSeatService.getSeatMap(showtime.getUuid(), java.util.List.of(), "test-user-unique@example.com");
		org.junit.jupiter.api.Assertions.assertNotNull(response);
		org.junit.jupiter.api.Assertions.assertFalse(response.getRows().isEmpty());
		System.out.println("Fetched rows: " + response.getRows().size());
	}
}
