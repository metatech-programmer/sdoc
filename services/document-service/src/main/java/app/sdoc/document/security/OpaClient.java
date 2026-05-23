package app.sdoc.document.security;

import app.sdoc.commons.exception.AccessDeniedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/**
 * Cliente para Open Policy Agent.
 * Consulta si el usuario puede realizar una acción sobre un documento.
 */
@Component
@Slf4j
public class OpaClient {

    private final WebClient webClient;
    private final String policyPath;
    private final String limitsPath;

    public OpaClient(WebClient.Builder webClientBuilder,
                     @Value("${opa.url:http://opa:8181}") String opaUrl,
                     @Value("${opa.policy-path:/v1/data/sdoc/documents/allow}") String policyPath,
                     @Value("${opa.limits-path:/v1/data/sdoc/limits}") String limitsPath) {
        this.webClient = webClientBuilder.baseUrl(opaUrl).build();
        this.policyPath = policyPath;
        this.limitsPath = limitsPath;
    }

    public void checkPermission(String action, Map<String, Object> user, Map<String, Object> document) {
        Map<String, Object> input = Map.of(
            "input", Map.of(
                "action", action,
                "user", user,
                "document", document
            )
        );

        Boolean allowed = webClient.post()
            .uri(policyPath)
            .bodyValue(input)
            .retrieve()
            .bodyToMono(OpaResponse.class)
            .map(OpaResponse::result)
            .blockOptional(Duration.ofSeconds(2))
            .orElse(false);

        if (!Boolean.TRUE.equals(allowed)) {
            log.warn("OPA denegó acción '{}' para documento {}", action,
                document.get("id"));
            throw new AccessDeniedException(action, String.valueOf(document.get("id")));
        }
    }

    public Map<String, Object> checkLimits(Map<String, Object> user, Map<String, Object> context) {
        Map<String, Object> input = Map.of("input", Map.of("user", user));

        return webClient.post()
            .uri(limitsPath)
            .bodyValue(input)
            .retrieve()
            .bodyToMono(Map.class)
            .blockOptional(Duration.ofSeconds(2))
            .map(r -> (Map<String, Object>) r.get("result"))
            .orElse(Map.of());
    }

    record OpaResponse(Boolean result) {}
}
