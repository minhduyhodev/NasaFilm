// package com.thdpv.movietheater.common.exception;

// import java.util.stream.Collectors;

// import org.springframework.http.ResponseEntity;
// import org.springframework.validation.FieldError;
// import org.springframework.web.bind.MethodArgumentNotValidException;
// import org.springframework.web.bind.annotation.ExceptionHandler;
// import org.springframework.web.bind.annotation.RestControllerAdvice;

// import lombok.extern.slf4j.Slf4j;

// @RestControllerAdvice
// @Slf4j
// public class GlobalExceptionHandler {

// // ── 1. AppException — lỗi business mình tự throw ─────────────────────────
// @ExceptionHandler(AppException.class)
// public ResponseEntity<ApiResponse<?>> handleApp(AppException ex) {
// log.warn("[AppException] code={} msg={}", ex.getErrorCode(),
// ex.getMessage());
// ErrorCode ec = ex.getErrorCode();
// return ResponseEntity
// .status(ec.getHttpStatus()) // HTTP status lấy thẳng từ ErrorCode
// .body(ApiResponse.error(ec, ex.getMessage()));
// }

// // ── 2. Validation — Spring tự throw khi @Valid fail ──────────────────────
// @ExceptionHandler(MethodArgumentNotValidException.class)
// public ResponseEntity<ApiResponse<?>> handleValidation(
// MethodArgumentNotValidException ex) {

// // Thu thập tất cả lỗi: field → message lỗi cụ thể
// Map<String, String> errors = ex.getBindingResult()
// .getFieldErrors()
// .stream()
// .collect(Collectors.toMap(
// FieldError::getField,
// fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Không hợp lệ"),
// (a, b) -> a // nếu 1 field có nhiều lỗi, giữ lỗi đầu tiên
// ));

// return ResponseEntity.badRequest()
// .body(ApiResponse.error(ErrorCode.VALIDATION_FAILED, errors));
// }

// // ── 3. Catch-all — bắt mọi lỗi bất ngờ còn lại ──────────────────────────
// @ExceptionHandler(Exception.class)
// public ResponseEntity<ApiResponse<?>> handleAll(Exception ex) {
// log.error("[UnexpectedException]", ex); // log full stack trace để debug
// return ResponseEntity.internalServerError()
// .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR));
// // KHÔNG expose chi tiết cho client — bảo mật
// }
// }