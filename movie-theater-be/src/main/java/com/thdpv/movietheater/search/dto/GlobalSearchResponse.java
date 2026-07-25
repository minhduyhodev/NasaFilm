package com.thdpv.movietheater.search.dto;

import java.util.ArrayList;
import java.util.List;

public class GlobalSearchResponse {

    private String query;
    private List<SearchResultItem> movies = new ArrayList<>();
    private List<SearchResultItem> cinemas = new ArrayList<>();
    private List<SearchResultItem> actors = new ArrayList<>();

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public List<SearchResultItem> getMovies() {
        return movies;
    }

    public void setMovies(List<SearchResultItem> movies) {
        this.movies = movies;
    }

    public List<SearchResultItem> getCinemas() {
        return cinemas;
    }

    public void setCinemas(List<SearchResultItem> cinemas) {
        this.cinemas = cinemas;
    }

    public List<SearchResultItem> getActors() {
        return actors;
    }

    public void setActors(List<SearchResultItem> actors) {
        this.actors = actors;
    }
}
