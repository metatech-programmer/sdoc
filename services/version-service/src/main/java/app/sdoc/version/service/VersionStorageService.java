package app.sdoc.version.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class VersionStorageService {

    private final MinioClient minioClient;
    private final ObjectMapper objectMapper;

    @Value("${sdoc.storage.bucket-versions:sdoc-versions}")
    private String bucket;

    public byte[] serializeContent(Object content) {
        try {
            return objectMapper.writeValueAsBytes(content);
        } catch (Exception e) {
            throw new RuntimeException("Error serializando contenido del documento", e);
        }
    }

    public void upload(String storageKey, byte[] data) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                .bucket(bucket)
                .object(storageKey)
                .stream(new ByteArrayInputStream(data), data.length, -1)
                .contentType("application/json")
                .build());
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo versión a MinIO: " + e.getMessage(), e);
        }
    }

    public byte[] downloadContent(String storageKey) {
        try (InputStream is = minioClient.getObject(
            GetObjectArgs.builder().bucket(bucket).object(storageKey).build())) {
            return is.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Error descargando versión desde MinIO: " + e.getMessage(), e);
        }
    }

    public String generateDownloadUrl(String storageKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(storageKey)
                    .expiry(24, TimeUnit.HOURS)
                    .build()
            );
        } catch (Exception e) {
            log.warn("No se pudo generar URL presignada para {}: {}", storageKey, e.getMessage());
            return null;
        }
    }
}
