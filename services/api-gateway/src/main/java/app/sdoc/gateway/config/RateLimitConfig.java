package app.sdoc.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

/**
 * Configuración de rate limiters por tipo de servicio.
 * Usa Redis Token Bucket algorithm (spring-cloud-gateway-redis).
 */
@Configuration
public class RateLimitConfig {

    /** 100 req/s replenish, burst 200 — para endpoints generales */
    @Bean
    public RedisRateLimiter defaultRateLimiter() {
        return new RedisRateLimiter(100, 200, 1);
    }

    /** Auth endpoints: restrictivo contra brute force — 10 req/s, burst 20 */
    @Bean
    public RedisRateLimiter authRateLimiter() {
        return new RedisRateLimiter(10, 20, 1);
    }

    /** Uploads: limitado por usuario — 5 req/s, burst 10 */
    @Bean
    public RedisRateLimiter uploadRateLimiter() {
        return new RedisRateLimiter(5, 10, 1);
    }

    /** Renders: costosos en CPU — 3 req/s, burst 5 */
    @Bean
    public RedisRateLimiter renderRateLimiter() {
        return new RedisRateLimiter(3, 5, 1);
    }

    /**
     * Resolver de clave para rate limiting.
     * Usa el subject del JWT si está autenticado, fallback a IP.
     */
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            var auth = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                String subject = extractSubFromJwt(token);
                return Mono.just("user:" + subject);
            }
            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            return Mono.just("ip:" + ip);
        };
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(
                exchange.getRequest().getRemoteAddress() != null
                        ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                        : "unknown"
        );
    }

    private String extractSubFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return "unknown";
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            String sub = payload.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
            return sub.equals(payload) ? "unknown" : sub;
        } catch (Exception e) {
            return "unknown";
        }
    }
}
