package com.thdpv.movietheater.movie.dto.response;

public class ReviewVibeTagResponse {

    private String code;
    private String label;
    private String hash;

    public ReviewVibeTagResponse() {
    }

    public ReviewVibeTagResponse(String code, String label, String hash) {
        this.code = code;
        this.label = label;
        this.hash = hash;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }
}
