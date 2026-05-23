package app.sdoc.document.repository;

import app.sdoc.document.domain.entity.DocumentReadModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repositorio de solo lectura sobre la vista materializada document_read_model.
 * Parte del CQRS Query Side — nunca usar para escrituras.
 */
@Repository
public interface DocumentReadModelRepository extends JpaRepository<DocumentReadModel, UUID> {

    /**
     * Lista documentos del usuario ordenados por fecha de actualización descendente.
     * Usado para el dashboard principal.
     */
    @Query(value = """
            SELECT drm FROM DocumentReadModel drm
            WHERE drm.id IN (
                SELECT d.id FROM Document d
                WHERE d.ownerId = :ownerId AND d.deletedAt IS NULL
            )
            ORDER BY drm.updatedAt DESC
            """)
    Page<DocumentReadModel> findByOwnerIdOrderByUpdatedAtDesc(
            @Param("ownerId") UUID ownerId,
            Pageable pageable
    );

    /**
     * Búsqueda full-text sobre el read model usando plainto_tsquery de PostgreSQL.
     */
    @Query(value = """
            SELECT drm.* FROM document_read_model drm
            INNER JOIN documents d ON d.id = drm.id
            WHERE d.owner_id = :ownerId
              AND d.deleted_at IS NULL
              AND (
                :query IS NULL OR :query = ''
                OR to_tsvector('spanish', drm.title) @@ plainto_tsquery('spanish', :query)
              )
              AND (
                :tags IS NULL
                OR d.tags && CAST(:tags AS text[])
              )
            ORDER BY drm.updated_at DESC
            """, nativeQuery = true)
    Page<DocumentReadModel> fullTextSearch(
            @Param("ownerId") UUID ownerId,
            @Param("query") String query,
            @Param("tags") String[] tags,
            Pageable pageable
    );
}
