package app.sdoc.asset.repository;

import app.sdoc.asset.domain.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {

    List<Asset> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);

    List<Asset> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @Query("SELECT COALESCE(SUM(a.sizeBytes), 0) FROM Asset a WHERE a.ownerId = :ownerId")
    Long sumSizeByOwner(@Param("ownerId") UUID ownerId);

    @Modifying
    @Query("UPDATE Asset a SET a.deletedAt = CURRENT_TIMESTAMP WHERE a.documentId = :documentId")
    void softDeleteByDocumentId(@Param("documentId") UUID documentId);
}
