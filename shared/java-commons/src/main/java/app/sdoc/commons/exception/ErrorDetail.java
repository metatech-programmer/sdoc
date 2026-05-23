package app.sdoc.commons.exception;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Detalle del error dentro de ErrorResponse.
 * Incluye código de error, mensaje legible y detalles adicionales (ej: errores de validación).
 */
@Data
@Builder
public class ErrorDetail {
    private String code;
    private String message;
    private Map<String, Object> details;
}
