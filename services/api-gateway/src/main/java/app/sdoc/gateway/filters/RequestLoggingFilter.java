package app.sdoc.gateway.filters;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Filtro de logging estructurado para todos los requests que pasan por el Gateway.
 * Registra método, path, status y latencia para observabilidad.
 */
@Component
@Slf4j
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        long startTime = System.currentTimeMillis();

        String requestId = request.getHeaders().getFirst("X-Request-Id");
        String method = request.getMethod().name();
        String path = request.getPath().value();

        log.info("Entrada: {} {} [requestId={}]", method, path, requestId);

        return chain.filter(exchange)
                .doFinally(signal -> {
                    ServerHttpResponse response = exchange.getResponse();
                    long latency = System.currentTimeMillis() - startTime;
                    int status = response.getStatusCode() != null
                            ? response.getStatusCode().value()
                            : 0;

                    log.info("Salida: {} {} → {} [{}ms] [requestId={}]",
                            method, path, status, latency, requestId);
                });
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
