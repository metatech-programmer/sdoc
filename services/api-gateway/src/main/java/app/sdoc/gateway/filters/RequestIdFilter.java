package app.sdoc.gateway.filters;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class RequestIdFilter implements GatewayFilter, Ordered {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        final String finalRequestId = requestId;

        return chain.filter(
            exchange.mutate()
                .request(r -> r.header(REQUEST_ID_HEADER, finalRequestId))
                .response(r -> {
                    r.getHeaders().add(REQUEST_ID_HEADER, finalRequestId);
                    return r;
                })
                .build()
        );
    }

    @Override
    public int getOrder() { return -2; }
}
