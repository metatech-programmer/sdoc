package app.sdoc.document.service;

import app.sdoc.commons.events.DocumentCreatedEvent;
import app.sdoc.commons.events.DocumentDeletedEvent;
import app.sdoc.commons.events.DocumentUpdatedEvent;
import app.sdoc.commons.exception.DocumentNotFoundException;
import app.sdoc.commons.outbox.OutboxPublisher;
import app.sdoc.commons.security.UserContext;
import app.sdoc.document.domain.dto.CreateDocumentRequest;
import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.domain.entity.Document;
import app.sdoc.document.repository.DocumentRepository;
import app.sdoc.document.security.OpaClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private static final String TOPIC_CREATED  = "sdoc.documents.created";
    private static final String TOPIC_UPDATED  = "sdoc.documents.updated";
    private static final String TOPIC_DELETED  = "sdoc.documents.deleted";

    private final DocumentRepository documentRepository;
    private final OutboxPublisher outboxPublisher;
    private final OpaClient opaClient;

    @Transactional
    public DocumentResponse create(CreateDocumentRequest request) {
        UserContext user = UserContext.fromRequest();

        Document doc = Document.builder()
            .ownerId(UUID.fromString(user.getUserId()))
            .title(request.title())
            .description(request.description())
            .language(request.language() != null ? request.language() : "es")
            .tags(request.tags() != null ? request.tags() : List.of())
            .content(request.content() != null ? request.content() : "{}")
            .build();

        documentRepository.save(doc);

        outboxPublisher.publish(
            new DocumentCreatedEvent(
                doc.getId().toString(),
                doc.getTitle(),
                doc.getOwnerId().toString(),
                user.getEmail(),
                user.getOrganizationId(),
                doc.getLanguage()
            ),
            TOPIC_CREATED
        );

        log.info("Documento creado: {} por usuario {}", doc.getId(), user.getUserId());
        return toResponse(doc);
    }

    @Transactional(readOnly = true)
    public DocumentResponse findById(String id) {
        UserContext user = UserContext.fromRequest();
        Document doc = findOrThrow(id);

        opaClient.checkPermission("read",
            Map.of("id", user.getUserId(), "roles", user.getRoles()),
            Map.of("id", id, "owner_id", doc.getOwnerId().toString(),
                "is_public", doc.getIsPublic())
        );

        return toResponse(doc);
    }

    @Transactional(readOnly = true)
    public Page<DocumentResponse> findByOwner(Pageable pageable) {
        UserContext user = UserContext.fromRequest();
        UUID ownerId = UUID.fromString(user.getUserId());
        return documentRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId, pageable)
            .map(this::toResponse);
    }

    /**
     * Devuelve la entidad cruda (no DTO) tras verificar permisos de lectura.
     * Usado por endpoints que necesitan acceso completo, como
     * {@code GET /documents/{id}/download.sdoc}.
     */
    @Transactional(readOnly = true)
    public Document findEntityById(String id) {
        UserContext user = UserContext.fromRequest();
        Document doc = findOrThrow(id);

        opaClient.checkPermission("read",
            Map.of("id", user.getUserId(), "roles", user.getRoles()),
            Map.of("id", id, "owner_id", doc.getOwnerId().toString(),
                "is_public", doc.getIsPublic())
        );

        return doc;
    }

    @Transactional
    public DocumentResponse update(String id, Object content) {
        UserContext user = UserContext.fromRequest();
        Document doc = findOrThrow(id);

        opaClient.checkPermission("edit",
            Map.of("id", user.getUserId(), "roles", user.getRoles()),
            Map.of("id", id, "owner_id", doc.getOwnerId().toString(),
                "is_public", doc.getIsPublic())
        );

        doc.setContent(content);
        documentRepository.save(doc);

        outboxPublisher.publish(
            new DocumentUpdatedEvent(
                doc.getId().toString(),
                doc.getTitle(),
                doc.getOwnerId().toString(),
                user.getUserId(),
                doc.getVersion()
            ),
            TOPIC_UPDATED
        );

        return toResponse(doc);
    }

    @Transactional
    public void delete(String id) {
        UserContext user = UserContext.fromRequest();
        Document doc = findOrThrow(id);

        opaClient.checkPermission("delete",
            Map.of("id", user.getUserId(), "roles", user.getRoles()),
            Map.of("id", id, "owner_id", doc.getOwnerId().toString(),
                "is_public", doc.getIsPublic())
        );

        doc.softDelete();
        documentRepository.save(doc);

        outboxPublisher.publish(
            new DocumentDeletedEvent(
                doc.getId().toString(),
                doc.getOwnerId().toString(),
                user.getUserId()
            ),
            TOPIC_DELETED
        );
    }

    private Document findOrThrow(String id) {
        return documentRepository.findById(UUID.fromString(id))
            .orElseThrow(() -> new DocumentNotFoundException(id));
    }

    private DocumentResponse toResponse(Document doc) {
        return DocumentResponse.builder()
            .id(doc.getId().toString())
            .title(doc.getTitle())
            .description(doc.getDescription())
            .status(doc.getStatus().name())
            .language(doc.getLanguage())
            .wordCount(doc.getWordCount())
            .pageCount(doc.getPageCount())
            .sizeBytes(doc.getSizeBytes())
            .version(doc.getVersion())
            .isPublic(doc.getIsPublic())
            .thumbnailUrl(doc.getThumbnailUrl())
            .tags(doc.getTags())
            .content(doc.getContent())
            .ownerId(doc.getOwnerId().toString())
            .organizationId(doc.getOrganizationId() != null
                ? doc.getOrganizationId().toString() : null)
            .createdAt(doc.getCreatedAt())
            .updatedAt(doc.getUpdatedAt())
            .build();
    }
}
