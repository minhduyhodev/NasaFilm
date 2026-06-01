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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleAll(Exception ex) {
        log.error("[UnexpectedException]", ex);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR));
    }
}
