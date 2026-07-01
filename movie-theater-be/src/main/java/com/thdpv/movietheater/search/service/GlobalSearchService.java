package com.thdpv.movietheater.search.service;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thdpv.movietheater.search.dto.GlobalSearchResponse;
import com.thdpv.movietheater.search.dto.SearchResultItem;

@Service
public class GlobalSearchService {

    private static final int LIMIT = 8;

    private final JdbcTemplate jdbc;

    public GlobalSearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public GlobalSearchResponse search(String query, String type) {
        GlobalSearchResponse response = new GlobalSearchResponse();
        response.setQuery(query);

        if (query == null || query.isBlank()) {
            return response;
        }

        String normalized = query.trim();
        String tsQuery = normalized.replace("'", "''");

        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type) || "movie".equalsIgnoreCase(type)) {
            response.setMovies(searchMovies(tsQuery, normalized));
        }
        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type) || "cinema".equalsIgnoreCase(type)) {
            response.setCinemas(searchCinemas(tsQuery, normalized));
        }
        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type) || "actor".equalsIgnoreCase(type)) {
            response.setActors(searchActors(tsQuery, normalized));
        }

        return response;
    }

    private List<SearchResultItem> searchMovies(String tsQuery, String likeQuery) {
        String sql = """
                SELECT m.uuid::text, m.title, coalesce(m.age_restriction, ''),
                       (
                         SELECT mm.media_url FROM movie_media mm
                         WHERE mm.movie_uuid = m.uuid AND mm.is_primary = true
                         LIMIT 1
                       ) AS poster
                FROM movie m
                WHERE lower(m.title) = lower(?)
                   OR m.title ILIKE ?
                ORDER BY
                  CASE WHEN lower(m.title) = lower(?) THEN 0 ELSE 1 END,
                  CASE WHEN lower(m.title) LIKE lower(?) THEN 0 ELSE 1 END,
                  m.title
                LIMIT ?
                """;
        String like = "%" + likeQuery + "%";
        String prefixLike = likeQuery + "%";
        return jdbc.query(sql, (rs, rowNum) -> {
            SearchResultItem item = new SearchResultItem();
            item.setType("movie");
            item.setUuid(rs.getString(1));
            item.setTitle(rs.getString(2));
            item.setSubtitle(rs.getString(3));
            item.setImageUrl(rs.getString(4));
            item.setHref("/movie/" + rs.getString(1));
            return item;
        }, likeQuery, like, likeQuery, prefixLike, LIMIT);
    }

    private List<SearchResultItem> searchCinemas(String tsQuery, String likeQuery) {
        String sql = """
                SELECT c.uuid::text, c.name, coalesce(c.address, '')
                FROM cinema c
                WHERE c.search_vector @@ plainto_tsquery('simple', ?)
                   OR c.name ILIKE ?
                   OR coalesce(c.address, '') ILIKE ?
                ORDER BY ts_rank(c.search_vector, plainto_tsquery('simple', ?)) DESC, c.name
                LIMIT ?
                """;
        String like = "%" + likeQuery + "%";
        return jdbc.query(sql, (rs, rowNum) -> {
            SearchResultItem item = new SearchResultItem();
            item.setType("cinema");
            item.setUuid(rs.getString(1));
            item.setTitle(rs.getString(2));
            item.setSubtitle(rs.getString(3));
            item.setHref("/cinemas");
            return item;
        }, tsQuery, like, like, tsQuery, LIMIT);
    }

    private List<SearchResultItem> searchActors(String tsQuery, String likeQuery) {
        String sql = """
                SELECT a.uuid::text, a.full_name, coalesce(ct.name, '')
                FROM actor a
                LEFT JOIN country ct ON ct.uuid = a.country_uuid
                WHERE lower(a.full_name) = lower(?)
                   OR a.search_vector @@ plainto_tsquery('simple', ?)
                   OR a.full_name ILIKE ?
                ORDER BY
                  CASE WHEN lower(a.full_name) = lower(?) THEN 0 ELSE 1 END,
                  CASE WHEN lower(a.full_name) LIKE lower(?) THEN 0 ELSE 1 END,
                  ts_rank(a.search_vector, plainto_tsquery('simple', ?)) DESC,
                  a.full_name
                LIMIT ?
                """;
        String like = "%" + likeQuery + "%";
        String prefixLike = likeQuery + "%";
        return jdbc.query(sql, (rs, rowNum) -> {
            SearchResultItem item = new SearchResultItem();
            item.setType("actor");
            item.setUuid(rs.getString(1));
            item.setTitle(rs.getString(2));
            item.setSubtitle(rs.getString(3));
            item.setHref("/movies?actor=" + rs.getString(1));
            return item;
        }, likeQuery, tsQuery, like, likeQuery, prefixLike, tsQuery, LIMIT);
    }
}
