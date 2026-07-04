package com.thdpv.movietheater.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.thdpv.movietheater.common.response.ApiResponse;
import com.thdpv.movietheater.user.dto.AdminCreateUserRequest;
import com.thdpv.movietheater.user.dto.AdminCreateUserResponse;
import com.thdpv.movietheater.user.dto.AdminUserResponse;
import com.thdpv.movietheater.user.dto.UpdateRoleRequest;
import com.thdpv.movietheater.user.dto.UpdateScoreRequest;
import com.thdpv.movietheater.user.dto.UpdateStatusRequest;
import com.thdpv.movietheater.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> getAllUsers(
            @RequestParam(value = "query", required = false) String query) {
        List<AdminUserResponse> users = userService.getAllUsers(query);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminCreateUserResponse>> createUser(
            @Valid @RequestBody AdminCreateUserRequest request) {
        AdminCreateUserResponse created = userService.createUserByAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateUserStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        userService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật trạng thái người dùng thành công"));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<Void>> updateUserRole(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {
        userService.updateUserRole(id, request.getRoleName());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật vai trò người dùng thành công"));
    }

    @PutMapping("/{id}/score")
    public ResponseEntity<ApiResponse<Void>> updateUserScore(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateScoreRequest request) {
        userService.updateUserScore(id, request.getScore());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật điểm tích lũy thành công"));
    }
}
