package app.sdoc.version.domain.dto;

import lombok.Builder;

import java.time.Instant;

@Builder
public record VersionResponse(
    String id,
    String documentId,
    int versionNumber,
    String title,
    String storageKey,
    String downloadUrl,
    Long sizeBytes,
    String changedByUserId,
    String changeSummary,
    Instant createdAt
) {}
