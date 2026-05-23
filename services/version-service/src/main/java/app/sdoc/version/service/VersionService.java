package app.sdoc.version.service;

import app.sdoc.version.domain.dto.VersionResponse;
import app.sdoc.version.domain.entity.DocumentVersion;
import app.sdoc.version.repository.DocumentVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VersionService {

    private final DocumentVersionRepository versionRepository;
    private final VersionStorageService storageService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${sdoc.version.auto-snapshot-every-n-changes:10}")
    private int snapshotEveryNChanges;

    @Transactional
    public DocumentVersion createSnapshot(
        String documentId,
        String title,
        Object contentJson,
        String changedByUserId,
        String changeSummary
    ) {
        UUID docId = UUID.fromString(documentId);
        int nextVersion = versionRepository.findMaxVersionNumber(docId)
            .map(v -> v + 1)
            .orElse(1);

        String storageKey = "versions/" + documentId + "/" + nextVersion + ".json";
        byte[] contentBytes = storageService.serializeContent(contentJson);
        storageService.upload(storageKey, contentBytes);

        DocumentVersion version = DocumentVersion.builder()
            .documentId(docId)
            .ownerId(UUID.fromString(changedByUserId))
            .versionNumber(nextVersion)
            .title(title)
            .storageKey(storageKey)
            .sizeBytes((long) contentBytes.length)
            .changedByUserId(UUID.fromString(changedByUserId))
            .changeSummary(changeSummary)
            .build();

        versionRepository.save(version);
        log.info("Snapshot v{} creado para documento {}", nextVersion, documentId);
        return version;
    }

    public boolean shouldCreateSnapshot(String documentId, int currentVersion) {
        return currentVersion % snapshotEveryNChanges == 0;
    }

    /**
     * Restaura un documento a una versión anterior.
     * Carga el contenido JSON desde MinIO y publica un evento Kafka que document-service
     * consume para sobrescribir el contenido actual del documento.
     */
    @Transactional
    public Map<String, Object> restoreVersion(String documentId, int versionNumber, String requestedByUserId) {
        DocumentVersion version = versionRepository
            .findByDocumentIdAndVersionNumber(UUID.fromString(documentId), versionNumber)
            .orElseThrow(() -> new RuntimeException(
                "Versión %d no encontrada para documento %s".formatted(versionNumber, documentId)));

        byte[] contentBytes = storageService.downloadContent(version.getStorageKey());
        Object contentJson;
        try {
            contentJson = objectMapper.readValue(contentBytes, Object.class);
        } catch (Exception e) {
            throw new RuntimeException("Error deserializando contenido de versión " + versionNumber, e);
        }

        // Publicar evento para que document-service actualice el documento
        Map<String, Object> restoreEvent = Map.of(
            "eventType", "DOCUMENT_RESTORE_REQUESTED",
            "documentId", documentId,
            "versionNumber", versionNumber,
            "contentJson", contentJson,
            "requestedByUserId", requestedByUserId != null ? requestedByUserId : "",
            "occurredAt", java.time.Instant.now().toString()
        );
        kafkaTemplate.send("sdoc.documents.restore-requested", documentId, restoreEvent);

        log.info("Restauración solicitada para documento {} a versión {}", documentId, versionNumber);
        return Map.of(
            "documentId", documentId,
            "restoredToVersion", versionNumber,
            "title", version.getTitle()
        );
    }

    @Transactional(readOnly = true)
    public List<VersionResponse> listVersions(String documentId) {
        return versionRepository
            .findByDocumentIdOrderByVersionNumberDesc(UUID.fromString(documentId))
            .stream()
            .map(v -> toResponse(v, storageService.generateDownloadUrl(v.getStorageKey())))
            .toList();
    }

    @Transactional(readOnly = true)
    public VersionResponse getVersion(String documentId, int versionNumber) {
        DocumentVersion version = versionRepository
            .findByDocumentIdAndVersionNumber(UUID.fromString(documentId), versionNumber)
            .orElseThrow(() -> new RuntimeException(
                "Versión %d no encontrada para documento %s".formatted(versionNumber, documentId)));
        return toResponse(version, storageService.generateDownloadUrl(version.getStorageKey()));
    }

    private VersionResponse toResponse(DocumentVersion v, String downloadUrl) {
        return VersionResponse.builder()
            .id(v.getId().toString())
            .documentId(v.getDocumentId().toString())
            .versionNumber(v.getVersionNumber())
            .title(v.getTitle())
            .storageKey(v.getStorageKey())
            .downloadUrl(downloadUrl)
            .sizeBytes(v.getSizeBytes())
            .changedByUserId(v.getChangedByUserId() != null ? v.getChangedByUserId().toString() : null)
            .changeSummary(v.getChangeSummary())
            .createdAt(v.getCreatedAt())
            .build();
    }
}
