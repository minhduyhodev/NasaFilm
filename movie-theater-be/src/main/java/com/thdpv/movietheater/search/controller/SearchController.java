package com.thdpv.movietheater.search.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.search.dto.GlobalSearchResponse;
import com.thdpv.movietheater.search.service.GlobalSearchService;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final GlobalSearchService globalSearchService;

    public SearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<GlobalSearchResponse>> search(
            @RequestParam("q") String query,
            @RequestParam(value = "type", defaultValue = "all") String type) {
        return ResponseEntity.ok(ApiResponse.success(globalSearchService.search(query, type)));
    }
}
