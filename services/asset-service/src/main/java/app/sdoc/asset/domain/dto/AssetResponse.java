package app.sdoc.asset.domain.dto;

import lombok.Builder;

import java.time.Instant;

@Builder
public record AssetResponse(
    String id,
    String documentId,
    String ownerId,
    String fileName,
    String contentType,
    Long sizeBytes,
    String storageKey,
    String downloadUrl,
    Instant createdAt
) {}
