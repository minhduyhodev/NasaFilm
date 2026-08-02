package com.thdpv.movietheater.common.exception;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.thdpv.movietheater.common.response.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<?>> handleApp(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("[AppException] code={} msg={}", errorCode, ex.getMessage());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fieldError -> Objects.requireNonNullElse(
                                fieldError.getDefaultMessage(),
                                "Gia tri khong hop le"),
                        (first, second) -> first));

        return ResponseEntity.badRequest()
                .body(ApiResponse.error(ErrorCode.VALIDATION_FAILED, errors));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<?>> handleAuthentication(AuthenticationException ex) {
        log.warn("[AuthenticationException] msg={}", ex.getMessage());
        return ResponseEntity
                .status(ErrorCode.INVALID_CREDENTIALS.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.INVALID_CREDENTIALS));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("[AccessDeniedException] msg={}", ex.getMessage());
        return ResponseEntity
                .status(ErrorCode.FORBIDDEN.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.FORBIDDEN));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        log.error("[DataIntegrityViolationException] msg={}", ex.getMessage());
        String detailMessage = "Dữ liệu bị trùng lặp hoặc vi phạm ràng buộc hệ thống.";
        if (ex.getMessage() != null && ex.getMessage().contains("uk_bookingseat_showtime_seat")) {
            detailMessage = "Ghế bạn chọn vừa có người khác đặt nhanh hơn. Vui lòng chọn ghế khác.";
        } else if (ex.getMessage() != null && ex.getMessage().contains("users_email_key")) {
            detailMessage = "Email này đã được đăng ký sử dụng trong hệ thống.";
        }
        return ResponseEntity
                .status(org.springframework.http.HttpStatus.CONFLICT)
                .body(ApiResponse.error(ErrorCode.CONFLICT, detailMessage));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ApiResponse<?>> handleResponseStatusException(org.springframework.web.server.ResponseStatusException ex) {
        log.warn("[ResponseStatusException] status={} msg={}", ex.getStatusCode(), ex.getReason());
        ErrorCode ec = ErrorCode.BAD_REQUEST;
        if (ex.getStatusCode() == org.springframework.http.HttpStatus.UNAUTHORIZED) {
            ec = ErrorCode.UNAUTHORIZED;
        } else if (ex.getStatusCode() == org.springframework.http.HttpStatus.FORBIDDEN) {
            ec = ErrorCode.FORBIDDEN;
        } else if (ex.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND) {
            ec = ErrorCode.NOT_FOUND;
        }
        return ResponseEntity.status(ex.getStatusCode())
                .body(ApiResponse.error(ec, ex.getReason()));
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<?>> handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        log.warn("[MethodArgumentTypeMismatchException] param={} value={}", ex.getName(), ex.getValue());
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCode.NOT_FOUND, "Không tìm thấy dữ liệu (Định dạng tham số không hợp lệ)"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<?>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("[IllegalArgumentException] msg={}", ex.getMessage());
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCode.NOT_FOUND, "Không tìm thấy dữ liệu (Tham số không hợp lệ)"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleAll(Exception ex) {
        log.error("[UnexpectedException]", ex);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR));
    }
}
