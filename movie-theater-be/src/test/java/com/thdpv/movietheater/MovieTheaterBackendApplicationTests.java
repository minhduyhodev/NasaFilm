package com.thdpv.movietheater;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
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
}

