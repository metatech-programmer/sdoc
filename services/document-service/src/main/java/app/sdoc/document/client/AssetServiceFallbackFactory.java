package app.sdoc.document.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class AssetServiceFallbackFactory implements FallbackFactory<AssetServiceClient> {

    @Override
    public AssetServiceClient create(Throwable cause) {
        return new AssetServiceClient() {
            @Override
            public List<Map<String, Object>> getAssetsByDocument(String documentId) {
                log.warn("AssetService no disponible para doc {}: {}", documentId, cause.getMessage());
                return Collections.emptyList();
            }

            @Override
            public void deleteAssetsByDocument(String documentId) {
                log.warn("AssetService no disponible para eliminar assets del doc {}", documentId);
            }
        };
    }
}
