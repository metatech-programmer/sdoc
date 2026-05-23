package app.sdoc.asset.service;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioStorageService {

    private final MinioClient minioClient;

    @Value("${minio.buckets.assets:sdoc-assets}")
    private String assetsBucket;

    public void uploadFile(String bucket, String key, InputStream inputStream, long size, String contentType) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                .bucket(bucket)
                .object(key)
                .stream(inputStream, size, -1)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build());
            log.debug("Archivo subido a MinIO: {}/{}", bucket, key);
        } catch (Exception e) {
            log.error("Error al subir archivo a MinIO: {}/{}", bucket, key, e);
            throw new RuntimeException("Error al almacenar el archivo", e);
        }
    }

    public String generatePresignedUrl(String bucket, String key) {
        return generatePresignedUrl(bucket, key, 60);
    }

    public String uploadFile(MultipartFile file, String key) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                .bucket(assetsBucket)
                .object(key)
                .stream(file.getInputStream(), file.getSize(), -1)
                .contentType(file.getContentType())
                .build());

            log.debug("Archivo subido a MinIO: {}/{}", assetsBucket, key);
            return key;

        } catch (Exception e) {
            log.error("Error al subir archivo a MinIO: {}", key, e);
            throw new RuntimeException("Error al almacenar el archivo", e);
        }
    }

    public String generatePresignedUrl(String bucket, String key, int expiryMinutes) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(bucket)
                .object(key)
                .expiry(expiryMinutes, TimeUnit.MINUTES)
                .build());
        } catch (Exception e) {
            log.error("Error al generar URL presignada: {}", key, e);
            throw new RuntimeException("Error al generar URL de descarga", e);
        }
    }

    public void deleteFile(String bucket, String key) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                .bucket(bucket)
                .object(key)
                .build());
        } catch (Exception e) {
            log.warn("Error al eliminar archivo de MinIO {}/{}: {}", bucket, key, e.getMessage());
        }
    }

    public InputStream downloadFile(String bucket, String key) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                .bucket(bucket)
                .object(key)
                .build());
        } catch (Exception e) {
            throw new RuntimeException("Error al descargar archivo: " + key, e);
        }
    }
}
