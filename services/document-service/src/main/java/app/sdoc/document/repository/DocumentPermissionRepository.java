package app.sdoc.document.repository;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio para permisos granulares sobre documentos.
 */
@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {

    Optional<DocumentPermission> findByDocumentIdAndGranteeId(UUID documentId, UUID granteeId);

    @Query("SELECT COUNT(p) FROM DocumentPermission p WHERE p.documentId = :documentId")
    long countByDocumentId(@Param("documentId") UUID documentId);

    void deleteByDocumentId(UUID documentId);
}

/**
 * Entidad de permiso de documento — tabla document_permissions.
 */
@Entity
@Table(name = "document_permissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "grantee_id", nullable = false)
    private UUID granteeId;

    @Column(name = "can_read")
    private boolean canRead = true;

    @Column(name = "can_edit")
    private boolean canEdit;

    @Column(name = "can_comment")
    private boolean canComment;

    @Column(name = "can_export")
    private boolean canExport;

    @Column(name = "can_share")
    private boolean canShare;

    @Column(name = "can_delete")
    private boolean canDelete;

    @Column(name = "granted_by")
    private UUID grantedBy;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at")
    private Instant createdAt;
}
