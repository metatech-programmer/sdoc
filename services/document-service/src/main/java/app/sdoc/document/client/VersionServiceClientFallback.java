package app.sdoc.document.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class VersionServiceClientFallback implements VersionServiceClient {

    @Override
    public List<Map<String, Object>> getVersions(String documentId) {
        log.warn("VersionService no disponible para documento {}", documentId);
        return Collections.emptyList();
    }
}
