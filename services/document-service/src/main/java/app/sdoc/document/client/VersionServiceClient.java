package app.sdoc.document.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;

@FeignClient(
    name = "version-service",
    fallback = VersionServiceClientFallback.class
)
public interface VersionServiceClient {

    @GetMapping("/api/v1/documents/{documentId}/versions")
    List<Map<String, Object>> getVersions(@PathVariable String documentId);
}
