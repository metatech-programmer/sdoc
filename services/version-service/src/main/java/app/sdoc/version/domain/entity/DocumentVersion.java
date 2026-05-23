package app.sdoc.version.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_versions", indexes = {
    @Index(name = "idx_dv_document_id", columnList = "document_id"),
    @Index(name = "idx_dv_document_version", columnList = "document_id, version_number", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "bucket", nullable = false, length = 63)
    @Builder.Default
    private String bucket = "sdoc-versions";

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "changed_by_user_id")
    private UUID changedByUserId;

    @Column(name = "change_summary", length = 500)
    private String changeSummary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
