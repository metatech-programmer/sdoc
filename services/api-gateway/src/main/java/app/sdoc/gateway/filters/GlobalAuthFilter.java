package app.sdoc.gateway.filters;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

/**
 * Valida JWT y proyecta claims de usuario como headers internos hacia los microservicios.
 * Ejecuta primero (order = -1) para que otros filtros tengan acceso a la identidad.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GlobalAuthFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = Arrays.asList(
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/actuator/health",
        "/actuator/info",
        "/fallback/",
        "/nginx-health"
    );

    private final ReactiveJwtDecoder jwtDecoder;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        return jwtDecoder.decode(token)
            .flatMap(jwt -> {
                // Proyectar claims como headers internos — no expuestos al cliente
                List<String> roles = jwt.getClaim("roles");
                String rolesHeader = roles != null ? String.join(",", roles) : "";

                ServerWebExchange mutated = exchange.mutate()
                    .request(r -> r
                        .header("X-User-Id", jwt.getSubject())
                        .header("X-User-Email", jwt.getClaimAsString("email"))
                        .header("X-User-Roles", rolesHeader)
                        .header("X-Org-Id", jwt.getClaimAsString("organization_id") != null
                            ? jwt.getClaimAsString("organization_id") : "")
                        .header("X-User-Plan", jwt.getClaimAsString("plan") != null
                            ? jwt.getClaimAsString("plan") : "FREE"))
                    .build();

                return chain.filter(mutated);
            })
            .onErrorResume(ex -> {
                log.warn("Token JWT inválido: {}", ex.getMessage());
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            });
    }

    @Override
    public int getOrder() { return -1; }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }
}
