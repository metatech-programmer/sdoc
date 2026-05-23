package app.sdoc.document.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;

@FeignClient(
    name = "asset-service",
    fallbackFactory = AssetServiceFallbackFactory.class
)
public interface AssetServiceClient {

    @GetMapping("/api/v1/assets/document/{documentId}")
    List<Map<String, Object>> getAssetsByDocument(@PathVariable String documentId);

    @DeleteMapping("/api/v1/assets/document/{documentId}")
    void deleteAssetsByDocument(@PathVariable String documentId);
}
