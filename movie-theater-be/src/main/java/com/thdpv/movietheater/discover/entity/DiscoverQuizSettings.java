package com.thdpv.movietheater.discover.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "discover_quiz_settings")
public class DiscoverQuizSettings {

    @Id
    @Column(name = "id", nullable = false)
    private Integer id = 1;

    @Column(name = "max_matches", nullable = false)
    private int maxMatches = 3;

    @Column(name = "max_genre_selections", nullable = false)
    private int maxGenreSelections = 2;

    @Column(name = "authenticated_question_count", nullable = false)
    private int authenticatedQuestionCount = 5;

    @Column(name = "guest_question_count", nullable = false)
    private int guestQuestionCount = 4;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public int getMaxMatches() {
        return maxMatches;
    }

    public void setMaxMatches(int maxMatches) {
        this.maxMatches = maxMatches;
    }

    public int getMaxGenreSelections() {
        return maxGenreSelections;
    }

    public void setMaxGenreSelections(int maxGenreSelections) {
        this.maxGenreSelections = maxGenreSelections;
    }

    public int getAuthenticatedQuestionCount() {
        return authenticatedQuestionCount;
    }

    public void setAuthenticatedQuestionCount(int authenticatedQuestionCount) {
        this.authenticatedQuestionCount = authenticatedQuestionCount;
    }

    public int getGuestQuestionCount() {
        return guestQuestionCount;
    }

    public void setGuestQuestionCount(int guestQuestionCount) {
        this.guestQuestionCount = guestQuestionCount;
    }
}
