package app.sdoc.commons.exception;

import lombok.Builder;
import lombok.Data;

/**
 * Formato estándar de respuesta de error para todos los microservicios SDOC.
 * Garantiza consistencia en las respuestas de error de la plataforma.
 */
@Data
@Builder
public class ErrorResponse {
    private boolean success;
    private ErrorDetail error;
    private Meta meta;
}
