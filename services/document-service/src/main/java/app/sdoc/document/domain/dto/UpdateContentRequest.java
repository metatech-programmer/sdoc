package app.sdoc.document.domain.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

/**
 * Request body para PATCH /api/v1/documents/{id}/content.
 * Contiene el nuevo contenido en formato SDOC JSON.
 */
public record UpdateContentRequest(
        @NotNull(message = "El contenido no puede ser nulo")
        Map<String, Object> content
) {}
