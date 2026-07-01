package com.thdpv.movietheater.search.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import com.thdpv.movietheater.search.dto.GlobalSearchResponse;
import com.thdpv.movietheater.search.dto.SearchResultItem;

@ExtendWith(MockitoExtension.class)
class GlobalSearchServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private GlobalSearchService globalSearchService;

    @Test
    void searchShouldPrioritizeTitleAndActorNameWithoutDescriptionMatching() {
        lenient().when(jdbcTemplate.query(
                anyString(),
                any(org.springframework.jdbc.core.RowMapper.class),
                any(Object[].class)))
                .thenReturn(List.of());

        GlobalSearchResponse response = globalSearchService.search("Pháo", "all");

        assertTrue(response.getMovies().isEmpty());
        assertTrue(response.getActors().isEmpty());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(jdbcTemplate, org.mockito.Mockito.atLeast(2))
                .query(sqlCaptor.capture(), any(org.springframework.jdbc.core.RowMapper.class), any(Object[].class));

        List<String> sqls = sqlCaptor.getAllValues();
        String movieSql = sqls.stream().filter(sql -> sql.contains("FROM movie m")).findFirst().orElse("");
        String actorSql = sqls.stream().filter(sql -> sql.contains("FROM actor a")).findFirst().orElse("");

        assertTrue(movieSql.contains("lower(m.title) = lower(?)"));
        assertTrue(movieSql.contains("m.title ILIKE ?"));
        assertTrue(!movieSql.contains("description"));
        assertTrue(!movieSql.contains("search_vector"));

        assertTrue(actorSql.contains("lower(a.full_name) = lower(?)"));
        assertTrue(actorSql.contains("a.search_vector @@ plainto_tsquery('simple', ?)"));
        assertTrue(actorSql.contains("a.full_name ILIKE ?"));
    }

    @Test
    void searchShouldReturnQueryUntouched() {
        lenient().when(jdbcTemplate.query(
                anyString(),
                any(org.springframework.jdbc.core.RowMapper.class),
                any(Object[].class)))
                .thenReturn(List.<SearchResultItem>of());

        GlobalSearchResponse response = globalSearchService.search("Pháo", "movie");

        assertTrue("Pháo".equals(response.getQuery()));
    }
}
