package com.thdpv.movietheater;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.thdpv.movietheater.user.repository.UserRepository;
import com.thdpv.movietheater.user.entity.User;
import java.util.List;

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

	@Autowired
	private UserRepository userRepository;

	@Test
	void contextLoads() {
		System.out.println("====== DB USERS DUMP ======");
		List<User> users = userRepository.findAll();
		for (User u : users) {
			System.out.println("USER: email=" + u.getEmail() + ", fullName=" + u.getFullName() + ", status=" + u.getStatus());
		}
		System.out.println("===========================");
	}

}
