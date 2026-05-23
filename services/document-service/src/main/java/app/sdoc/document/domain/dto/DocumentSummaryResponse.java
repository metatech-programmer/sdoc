package app.sdoc.document.domain.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO de resumen de documento para listados y dashboard.
 * Contiene solo campos necesarios para la vista de lista, evitando transferir el contenido completo.
 */
public record DocumentSummaryResponse(
        UUID id,
        String title,
        String description,
        String status,
        UUID ownerId,
        Integer wordCount,
        Integer pageCount,
        Long version,
        List<String> tags,
        Boolean isPublic,
        Boolean syncEnabled,
        Instant createdAt,
        Instant updatedAt
) {}
