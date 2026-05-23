package app.sdoc.gateway.fallback;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class GatewayFallbackController {

    @RequestMapping("/documents")
    public ResponseEntity<Map<String, Object>> documentsFallback(ServerWebExchange exchange) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallbackBody(
            "SERVICE_UNAVAILABLE",
            "El servicio de documentos no está disponible temporalmente. Inténtalo en unos segundos.",
            30
        ));
    }

    @RequestMapping("/auth")
    public ResponseEntity<Map<String, Object>> authFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallbackBody(
            "AUTH_SERVICE_UNAVAILABLE",
            "El servicio de autenticación no está disponible temporalmente.",
            30
        ));
    }

    @RequestMapping("/assets")
    public ResponseEntity<Map<String, Object>> assetsFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallbackBody(
            "ASSET_SERVICE_UNAVAILABLE",
            "El servicio de archivos no está disponible temporalmente.",
            30
        ));
    }

    @RequestMapping("/versions")
    public ResponseEntity<Map<String, Object>> versionsFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(fallbackBody(
            "VERSION_SERVICE_UNAVAILABLE",
            "El servicio de versiones no está disponible temporalmente.",
            30
        ));
    }

    @RequestMapping("/render")
    public ResponseEntity<Map<String, Object>> renderFallback() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
            "success", false,
            "error", Map.of(
                "code", "RENDER_SERVICE_BUSY",
                "message", "El servicio de exportación está procesando muchas solicitudes. Tu exportación se procesará cuando esté disponible.",
                "retryAfter", 60
            ),
            "meta", Map.of("timestamp", Instant.now().toString())
        ));
    }

    private Map<String, Object> fallbackBody(String code, String message, int retryAfter) {
        return Map.of(
            "success", false,
            "error", Map.of(
                "code", code,
                "message", message,
                "retryAfter", retryAfter
            ),
            "meta", Map.of("timestamp", Instant.now().toString())
        );
    }
}
