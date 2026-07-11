package com.thdpv.movietheater.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
import com.thdpv.movietheater.user.dto.AdminUserStatsResponse;
import com.thdpv.movietheater.user.dto.PermissionResponse;
import com.thdpv.movietheater.user.dto.UpdateRoleRequest;
import com.thdpv.movietheater.user.dto.UpdateScoreRequest;
import com.thdpv.movietheater.user.dto.UpdateStatusRequest;
import com.thdpv.movietheater.user.dto.UpdateUserPermissionsRequest;
import com.thdpv.movietheater.user.enums.UserStatus;
import com.thdpv.movietheater.user.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('USER_VIEW')")
    public ResponseEntity<ApiResponse<Page<AdminUserResponse>>> getAllUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "status", required = false) UserStatus status,
            @RequestParam(value = "audience", required = false, defaultValue = "CUSTOMER") String audience,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        boolean staffOnly = "STAFF".equalsIgnoreCase(audience);
        return ResponseEntity.ok(ApiResponse.success(userService.getAdminUsers(query, status, pageable, staffOnly)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('USER_VIEW')")
    public ResponseEntity<ApiResponse<AdminUserStatsResponse>> getCustomerUserStats() {
        return ResponseEntity.ok(ApiResponse.success(userService.getCustomerUserStats()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminCreateUserResponse>> createUser(
            @Valid @RequestBody AdminCreateUserRequest request) {
        AdminCreateUserResponse created = userService.createUserByAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUserStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        userService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật trạng thái người dùng thành công"));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUserRole(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {
        userService.updateUserRole(id, request.getRoleName());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật vai trò người dùng thành công"));
    }

    @PutMapping("/{id}/score")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateUserScore(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateScoreRequest request) {
        userService.updateUserScore(id, request.getScore());
        return ResponseEntity.ok(ApiResponse.success(null, "Cập nhật điểm tích lũy thành công"));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAvailablePermissions() {
        return ResponseEntity.ok(ApiResponse.success(userService.getAvailablePermissions()));
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> updateUserPermissions(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateUserPermissionsRequest request) {
        List<String> permissions = userService.updateUserPermissions(id, request.getPermissions());
        return ResponseEntity.ok(ApiResponse.success(permissions, "Cập nhật quyền nhân viên thành công"));
    }
}
