package app.sdoc.document.domain.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.util.UUID;

/**
 * Proyección de solo lectura sobre la vista materializada document_read_model.
 * Optimizada para queries del dashboard: join con users, conteo de colaboradores y thumbnail URL.
 * CQRS — Query Side. Nunca usar para escrituras.
 */
@Entity
@Table(name = "document_read_model")
@Immutable
public class DocumentReadModel {

    @Id
    private UUID id;

    private String title;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "owner_avatar_url")
    private String ownerAvatarUrl;

    @Column(name = "status")
    private String status;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "collaborator_count")
    private Integer collaboratorCount;

    @Column(name = "tags", columnDefinition = "text[]")
    private String[] tags;

    @Column(name = "is_public")
    private Boolean isPublic;

    @Column(name = "version")
    private Long version;

    // Getters
    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getOwnerName() { return ownerName; }
    public String getOwnerAvatarUrl() { return ownerAvatarUrl; }
    public String getStatus() { return status; }
    public Integer getWordCount() { return wordCount; }
    public Integer getPageCount() { return pageCount; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Integer getCollaboratorCount() { return collaboratorCount; }
    public String[] getTags() { return tags; }
    public Boolean getIsPublic() { return isPublic; }
    public Long getVersion() { return version; }
}
