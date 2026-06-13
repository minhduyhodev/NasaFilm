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

	@Test
	void contextLoads() {
	}

}

