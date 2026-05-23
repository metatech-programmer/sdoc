package app.sdoc.version.repository;

import app.sdoc.version.domain.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {

    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(UUID documentId);

    Optional<DocumentVersion> findByDocumentIdAndVersionNumber(UUID documentId, int versionNumber);

    @Query("SELECT MAX(v.versionNumber) FROM DocumentVersion v WHERE v.documentId = :docId")
    Optional<Integer> findMaxVersionNumber(@Param("docId") UUID documentId);

    long countByDocumentId(UUID documentId);
}
