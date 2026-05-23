package app.sdoc.gateway.config;

import app.sdoc.gateway.filters.CorrelationIdFilter;
import app.sdoc.gateway.filters.RequestIdFilter;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.util.Base64;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder,
                                           CorrelationIdFilter correlationIdFilter,
                                           RequestIdFilter requestIdFilter) {
        return builder.routes()

            // ---- AUTH SERVICE ----
            .route("auth-service", r -> r
                .path("/api/v1/auth/**")
                .filters(f -> f
                    .filter(requestIdFilter)
                    .filter(correlationIdFilter)
                    .circuitBreaker(c -> c
                        .setName("auth-service-cb")
                        .setFallbackUri("forward:/fallback/auth"))
                    .requestRateLimiter(rl -> rl
                        .setRateLimiter(authRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                    .addResponseHeader("X-Service", "auth-service"))
                .uri("lb://auth-service"))

            // ---- DOCUMENT SERVICE ----
            .route("document-service", r -> r
                .path("/api/v1/documents/**")
                .filters(f -> f
                    .filter(requestIdFilter)
                    .filter(correlationIdFilter)
                    .circuitBreaker(c -> c
                        .setName("document-service-cb")
                        .setFallbackUri("forward:/fallback/documents"))
                    .requestRateLimiter(rl -> rl
                        .setRateLimiter(defaultRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                    .addResponseHeader("X-Service", "document-service"))
                .uri("lb://document-service"))

            // ---- ASSET SERVICE ----
            .route("asset-service", r -> r
                .path("/api/v1/assets/**")
                .filters(f -> f
                    .filter(requestIdFilter)
                    .circuitBreaker(c -> c
                        .setName("asset-service-cb")
                        .setFallbackUri("forward:/fallback/assets"))
                    .requestRateLimiter(rl -> rl
                        .setRateLimiter(uploadRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://asset-service"))

            // ---- VERSION SERVICE ----
            .route("version-service", r -> r
                .path("/api/v1/documents/*/versions/**")
                .filters(f -> f
                    .circuitBreaker(c -> c
                        .setName("version-service-cb")
                        .setFallbackUri("forward:/fallback/versions")))
                .uri("lb://version-service"))

            // ---- RENDER SERVICE ----
            .route("render-service", r -> r
                .path("/api/v1/render/**")
                .filters(f -> f
                    .circuitBreaker(c -> c
                        .setName("render-service-cb")
                        .setFallbackUri("forward:/fallback/render"))
                    .requestRateLimiter(rl -> rl
                        .setRateLimiter(renderRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://render-service"))

            // ---- SYNC SERVICE (WebSocket) ----
            .route("sync-service-ws", r -> r
                .path("/ws/**")
                .filters(f -> f.filter(requestIdFilter))
                .uri("lb:ws://sync-service"))

            .build();
    }

    // ---- RATE LIMITERS ----

    @Bean
    public RedisRateLimiter defaultRateLimiter() {
        return new RedisRateLimiter(100, 200, 1);
    }

    @Bean
    public RedisRateLimiter authRateLimiter() {
        return new RedisRateLimiter(10, 20, 1);
    }

    @Bean
    public RedisRateLimiter uploadRateLimiter() {
        return new RedisRateLimiter(5, 10, 1);
    }

    @Bean
    public RedisRateLimiter renderRateLimiter() {
        return new RedisRateLimiter(3, 5, 1);
    }

    // ---- KEY RESOLVERS ----

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String auth = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                String subject = extractSubFromJwt(auth.substring(7));
                return Mono.just("user:" + subject);
            }
            String ip = exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
            return Mono.just("ip:" + ip);
        };
    }

    private String extractSubFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return "unknown";
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            String sub = payload.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
            return sub.equals(payload) ? "unknown" : sub;
        } catch (Exception e) {
            return "unknown";
        }
    }
}
