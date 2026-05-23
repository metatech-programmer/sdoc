package app.sdoc.commons.exception;

import app.sdoc.commons.dto.ErrorDetail;
import app.sdoc.commons.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(SdocException.class)
    public ResponseEntity<ErrorResponse> handleSdocException(SdocException ex, WebRequest request) {
        log.warn("SdocException [{}]: {}", ex.getErrorCode(), ex.getMessage());

        return ResponseEntity
            .status(ex.getHttpStatus())
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code(ex.getErrorCode())
                    .message(ex.getMessage())
                    .build())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
        MethodArgumentNotValidException ex
    ) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.toList());

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code("VALIDATION_ERROR")
                    .message("Error de validación")
                    .details(errors)
                    .build())
                .timestamp(Instant.now())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, WebRequest request) {
        log.error("Error no controlado: {}", ex.getMessage(), ex);

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code("INTERNAL_ERROR")
                    .message("Error interno del servidor. Inténtalo de nuevo en unos momentos.")
                    .build())
                .timestamp(Instant.now())
                .build());
    }
}
