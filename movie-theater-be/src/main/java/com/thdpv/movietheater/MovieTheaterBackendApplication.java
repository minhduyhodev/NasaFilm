package com.thdpv.movietheater;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.DependsOn;

import com.thdpv.movietheater.config.WalletSchemaPreBootstrap;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@DependsOn("walletSchemaMigrator")
public class MovieTheaterBackendApplication {

	public static void main(String[] args) {
		Map<String, Object> envProps = loadEnv();
		WalletSchemaPreBootstrap.apply();
		SpringApplication app = new SpringApplication(MovieTheaterBackendApplication.class);
		if (!envProps.isEmpty()) {
			app.setDefaultProperties(envProps);
		}
		app.run(args);
	}

	private static Map<String, Object> loadEnv() {
		Map<String, Object> props = new java.util.LinkedHashMap<>();
		try {
			if (Files.exists(Paths.get(".env"))) {
				List<String> lines = Files.readAllLines(Paths.get(".env"));
				for (String line : lines) {
					line = line.trim();
					if (line.isEmpty() || line.startsWith("#")) {
						continue;
					}
					int eqIdx = line.indexOf('=');
					if (eqIdx > 0) {
						String key = line.substring(0, eqIdx).trim()
								.replace("\uFEFF", "")
								.replace("\u200B", "")
								.replace("\u00A0", "");
						String value = line.substring(eqIdx + 1).trim()
								.replace("\uFEFF", "")
								.replace("\u200B", "");
						if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						} else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						}
						props.put(key, value);
						System.setProperty(key, value);
					}
				}
				System.out.println("[EnvLoader] Loaded " + props.size() + " vars from .env (GROQ=" 
						+ (props.containsKey("APP_GROQ_API_KEY") && !String.valueOf(props.get("APP_GROQ_API_KEY")).isBlank())
						+ ", OPENAI=" + (props.containsKey("APP_OPENAI_API_KEY") && !String.valueOf(props.get("APP_OPENAI_API_KEY")).isBlank())
						+ ", GEMINI=" + (props.containsKey("APP_GEMINI_API_KEY") && !String.valueOf(props.get("APP_GEMINI_API_KEY")).isBlank())
						+ ").");
			} else {
				System.out.println("[EnvLoader] No .env file found in root directory.");
			}
		} catch (IOException e) {
			System.err.println("[EnvLoader] Failed to load .env file: " + e.getMessage());
		}
		return props;
	}

}
