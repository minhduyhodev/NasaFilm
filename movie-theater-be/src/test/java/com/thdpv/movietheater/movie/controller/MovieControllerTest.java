package com.thdpv.movietheater.movie.controller;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thdpv.movietheater.movie.dto.request.CreateMovieRequest;
import com.thdpv.movietheater.movie.dto.request.MovieFilterRequest;
import com.thdpv.movietheater.movie.dto.request.MovieMediaRequest;
import com.thdpv.movietheater.movie.dto.request.UpdateMovieRequest;
import com.thdpv.movietheater.movie.dto.response.ActorResponse;
import com.thdpv.movietheater.movie.dto.response.MovieDetailResponse;
import com.thdpv.movietheater.movie.dto.response.MovieListResponse;
import com.thdpv.movietheater.movie.dto.response.MovieMediaResponse;
import org.springframework.data.domain.Pageable;
import com.thdpv.movietheater.movie.service.MovieService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;

@SpringBootTest
@AutoConfigureMockMvc
class MovieControllerTest {

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
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MovieService movieService;

    @Test
    void getMovieListShouldReturnApiResponse() throws Exception {
        MovieListResponse movie = new MovieListResponse(
                UUID.randomUUID(),
                "Interstellar",
                "Space travel",
                169,
                LocalDate.of(2014, 11, 7),
                "NOW_SHOWING",
                "T13",
                "https://cdn/poster.jpg",
                List.of("Sci-Fi"),
                List.of("US"),
                OffsetDateTime.now(),
                OffsetDateTime.now());
        Page<MovieListResponse> page = new PageImpl<>(List.of(movie), PageRequest.of(0, 10), 1);

        when(movieService.getMovieList(any(MovieFilterRequest.class), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].title").value("Interstellar"))
                .andExpect(jsonPath("$.data.content[0].genres[0]").value("Sci-Fi"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void getMovieDetailShouldReturnApiResponse() throws Exception {
        MovieDetailResponse response = new MovieDetailResponse(
                UUID.randomUUID(),
                "Interstellar",
                "Space travel",
                169,
                LocalDate.of(2014, 11, 7),
                "NOW_SHOWING",
                "T13",
                List.of("Sci-Fi"),
                List.of("US"),
                List.of(new ActorResponse(UUID.randomUUID(), "Matthew McConaughey", null, "United States", "Cooper", 1, true)),
                List.of(new MovieMediaResponse(UUID.randomUUID(), "https://cdn/poster.jpg", "POSTER", "Poster", true, 0,
                        OffsetDateTime.now(), OffsetDateTime.now())),
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(movieService.getMovieDetail(any())).thenReturn(response);

        mockMvc.perform(get("/api/movies/{movieUuid}", UUID.randomUUID()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Interstellar"))
                .andExpect(jsonPath("$.data.actors[0].fullName").value("Matthew McConaughey"));
    }

    @Test
    void createMovieShouldAllowAdmin() throws Exception {
        MovieDetailResponse response = new MovieDetailResponse(
                UUID.randomUUID(),
                "Interstellar",
                "Space travel",
                169,
                LocalDate.of(2014, 11, 7),
                "DRAFT",
                "T13",
                List.of("Sci-Fi"),
                List.of("US"),
                List.of(),
                List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(movieService.createMovie(any(CreateMovieRequest.class), anyString())).thenReturn(response);

        CreateMovieRequest request = new CreateMovieRequest(
                "Interstellar",
                "Space travel",
                169,
                LocalDate.of(2014, 11, 7),
                "DRAFT",
                "T13",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null);

        mockMvc.perform(post("/api/admin/movies")
                        .with(user("admin@example.com").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Interstellar"));
    }

    @Test
    void updateMovieShouldAllowAdmin() throws Exception {
        UUID movieUuid = UUID.randomUUID();
        MovieDetailResponse response = new MovieDetailResponse(
                movieUuid,
                "Interstellar Updated",
                "Space travel updated",
                171,
                LocalDate.of(2014, 11, 7),
                "COMING_SOON",
                "T13",
                List.of("Sci-Fi"),
                List.of("US"),
                List.of(),
                List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(movieService.updateMovie(any(), any(UpdateMovieRequest.class), anyString())).thenReturn(response);

        UpdateMovieRequest request = new UpdateMovieRequest(
                "Interstellar Updated",
                "Space travel updated",
                171,
                LocalDate.of(2014, 11, 7),
                "COMING_SOON",
                "T13",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null);

        mockMvc.perform(put("/api/admin/movies/{movieUuid}", movieUuid)
                        .with(user("admin@example.com").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Interstellar Updated"))
                .andExpect(jsonPath("$.data.status").value("COMING_SOON"));
    }

    @Test
    void deleteMovieShouldAllowAdmin() throws Exception {
        doNothing().when(movieService).softDeleteMovie(any());

        mockMvc.perform(delete("/api/admin/movies/{movieUuid}", UUID.randomUUID())
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xoa mem phim thanh cong"));
    }

    @Test
    void addMovieMediaShouldAllowStaff() throws Exception {
        UUID movieUuid = UUID.randomUUID();
        MovieMediaResponse response = new MovieMediaResponse(
                UUID.randomUUID(),
                "https://cdn/banner.jpg",
                "BANNER",
                "Banner",
                true,
                1,
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(movieService.addMovieMedia(any(), any(MovieMediaRequest.class), anyString())).thenReturn(response);

        MovieMediaRequest request = new MovieMediaRequest(
                "https://cdn/banner.jpg",
                "BANNER",
                "Banner",
                true,
                1);

        mockMvc.perform(post("/api/admin/movies/{movieUuid}/media", movieUuid)
                        .with(user("staff@example.com").roles("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.mediaType").value("BANNER"))
                .andExpect(jsonPath("$.data.mediaUrl").value("https://cdn/banner.jpg"));
    }

    @Test
    void updateMovieMediaShouldAllowStaff() throws Exception {
        UUID movieUuid = UUID.randomUUID();
        UUID mediaUuid = UUID.randomUUID();
        MovieMediaResponse response = new MovieMediaResponse(
                mediaUuid,
                "https://cdn/trailer.mp4",
                "TRAILER",
                "Trailer 1",
                false,
                2,
                OffsetDateTime.now(),
                OffsetDateTime.now());

        when(movieService.updateMovieMedia(any(), any(), any(MovieMediaRequest.class), anyString())).thenReturn(response);

        MovieMediaRequest request = new MovieMediaRequest(
                "https://cdn/trailer.mp4",
                "TRAILER",
                "Trailer 1",
                false,
                2);

        mockMvc.perform(put("/api/admin/movies/{movieUuid}/media/{mediaUuid}", movieUuid, mediaUuid)
                        .with(user("staff@example.com").roles("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.mediaType").value("TRAILER"))
                .andExpect(jsonPath("$.data.title").value("Trailer 1"));
    }

    @Test
    void deleteMovieMediaShouldAllowStaff() throws Exception {
        doNothing().when(movieService).deleteMovieMedia(any(), any());

        mockMvc.perform(delete("/api/admin/movies/{movieUuid}/media/{mediaUuid}", UUID.randomUUID(), UUID.randomUUID())
                        .with(user("staff@example.com").roles("STAFF")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xoa media phim thanh cong"));
    }
}
