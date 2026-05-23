package app.sdoc.commons.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Metadatos del request incluidos en todas las respuestas de error.
 * Facilita la correlación de errores en los logs y el tracing distribuido.
 */
@Data
@Builder
public class Meta {
    private String requestId;
    private String timestamp;
    private String path;

    public static Meta of(HttpServletRequest request) {
        return Meta.builder()
                .requestId(request.getHeader("X-Request-Id"))
                .timestamp(Instant.now().toString())
                .path(request.getRequestURI())
                .build();
    }
}
