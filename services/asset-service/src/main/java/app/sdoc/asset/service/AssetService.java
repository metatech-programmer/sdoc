package app.sdoc.asset.service;

import app.sdoc.asset.domain.dto.AssetResponse;
import app.sdoc.asset.domain.entity.Asset;
import app.sdoc.asset.repository.AssetRepository;
import app.sdoc.commons.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssetService {

    private final AssetRepository assetRepository;
    private final MinioStorageService minioStorageService;

    @Transactional
    public AssetResponse upload(String documentId, MultipartFile file) {
        UserContext user = UserContext.fromRequest();

        String storageKey = "assets/" + documentId + "/" + UUID.randomUUID() + "/" + file.getOriginalFilename();
        String bucket = "sdoc-assets";

        try {
            minioStorageService.uploadFile(bucket, storageKey, file.getInputStream(),
                file.getSize(), file.getContentType());
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo archivo a MinIO: " + e.getMessage(), e);
        }

        Asset asset = Asset.builder()
            .documentId(UUID.fromString(documentId))
            .ownerId(UUID.fromString(user.getUserId()))
            .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo")
            .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
            .sizeBytes(file.getSize())
            .storageKey(storageKey)
            .bucket(bucket)
            .build();

        assetRepository.save(asset);
        log.info("Asset subido: {} para documento {}", asset.getId(), documentId);

        String downloadUrl = minioStorageService.generatePresignedUrl(bucket, storageKey);
        return toResponse(asset, downloadUrl);
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> findByDocument(String documentId) {
        return assetRepository
            .findByDocumentIdOrderByCreatedAtDesc(UUID.fromString(documentId))
            .stream()
            .map(a -> toResponse(a, minioStorageService.generatePresignedUrl(a.getBucket(), a.getStorageKey())))
            .toList();
    }

    @Transactional
    public void delete(String assetId) {
        Asset asset = assetRepository.findById(UUID.fromString(assetId))
            .orElseThrow(() -> new RuntimeException("Asset no encontrado: " + assetId));

        minioStorageService.deleteFile(asset.getBucket(), asset.getStorageKey());
        asset.softDelete();
        assetRepository.save(asset);
        log.info("Asset eliminado: {}", assetId);
    }

    @Transactional
    public void deleteByDocument(String documentId) {
        assetRepository.findByDocumentIdOrderByCreatedAtDesc(UUID.fromString(documentId))
            .forEach(a -> {
                try {
                    minioStorageService.deleteFile(a.getBucket(), a.getStorageKey());
                } catch (Exception e) {
                    log.warn("No se pudo eliminar objeto MinIO {}: {}", a.getStorageKey(), e.getMessage());
                }
            });
        assetRepository.softDeleteByDocumentId(UUID.fromString(documentId));
    }

    private AssetResponse toResponse(Asset asset, String downloadUrl) {
        return AssetResponse.builder()
            .id(asset.getId().toString())
            .documentId(asset.getDocumentId().toString())
            .ownerId(asset.getOwnerId().toString())
            .fileName(asset.getFileName())
            .contentType(asset.getContentType())
            .sizeBytes(asset.getSizeBytes())
            .storageKey(asset.getStorageKey())
            .downloadUrl(downloadUrl)
            .createdAt(asset.getCreatedAt())
            .build();
    }
}
