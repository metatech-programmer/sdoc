package app.sdoc.document.repository;

import app.sdoc.document.domain.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    Page<Document> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId, Pageable pageable);

    Page<Document> findByOrganizationIdOrderByUpdatedAtDesc(UUID organizationId, Pageable pageable);

    Optional<Document> findByShareToken(String shareToken);

    // Full-text search con PostgreSQL
    @Query(value = """
        SELECT * FROM documents
        WHERE deleted_at IS NULL
          AND (owner_id = :ownerId OR is_public = true)
          AND search_vector @@ plainto_tsquery('sdoc_spanish', :query)
        ORDER BY ts_rank(search_vector, plainto_tsquery('sdoc_spanish', :query)) DESC
        """, nativeQuery = true)
    Page<Document> fullTextSearch(@Param("query") String query,
                                  @Param("ownerId") UUID ownerId,
                                  Pageable pageable);
}
