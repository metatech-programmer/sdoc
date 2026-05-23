package app.sdoc.gateway.filters;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.reactivestreams.Publisher;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Filtro de idempotencia para prevenir procesamiento duplicado de requests POST/PATCH.
 * Usa Redis para almacenar la respuesta real del primer request exitoso.
 * Requests con el mismo Idempotency-Key reciben la respuesta cacheada.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdempotencyFilter implements GlobalFilter, Ordered {

    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
    private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);
    private static final String PREFIX = "idempotency:";

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpMethod method = exchange.getRequest().getMethod();

        if (method != HttpMethod.POST && method != HttpMethod.PATCH) {
            return chain.filter(exchange);
        }

        String idempotencyKey = exchange.getRequest().getHeaders().getFirst(IDEMPOTENCY_KEY_HEADER);
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return chain.filter(exchange);
        }

        String redisKey = PREFIX + idempotencyKey;

        return redisTemplate.opsForValue().get(redisKey)
            .flatMap(cached -> {
                if (cached != null && !cached.equals("processing")) {
                    // Respuesta cacheada — devolver sin procesar upstream
                    log.debug("Idempotency hit para key={}", idempotencyKey);
                    exchange.getResponse().setStatusCode(HttpStatus.OK);
                    exchange.getResponse().getHeaders().add("X-Idempotent-Replayed", "true");
                    DataBuffer buffer = exchange.getResponse().bufferFactory()
                        .wrap(cached.getBytes(StandardCharsets.UTF_8));
                    return exchange.getResponse().writeWith(Mono.just(buffer));
                }

                // Marcar como en proceso para evitar race conditions
                return redisTemplate.opsForValue()
                    .set(redisKey, "processing", IDEMPOTENCY_TTL)
                    .then(Mono.defer(() -> {
                        // Decorar la respuesta para capturar el body real
                        ServerHttpResponse originalResponse = exchange.getResponse();
                        ServerHttpResponseDecorator decorator = new ServerHttpResponseDecorator(originalResponse) {
                            @Override
                            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                                return DataBufferUtils.join(Flux.from(body))
                                    .flatMap(dataBuffer -> {
                                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                                        dataBuffer.read(bytes);
                                        DataBufferUtils.release(dataBuffer);

                                        String responseBody = new String(bytes, StandardCharsets.UTF_8);

                                        // Solo cachear respuestas exitosas (2xx)
                                        HttpStatus status = (HttpStatus) getStatusCode();
                                        if (status != null && status.is2xxSuccessful()) {
                                            redisTemplate.opsForValue()
                                                .set(redisKey, responseBody, IDEMPOTENCY_TTL)
                                                .subscribe();
                                        } else {
                                            // Limpiar la marca "processing" si falló
                                            redisTemplate.delete(redisKey).subscribe();
                                        }

                                        DataBuffer wrappedBuffer = originalResponse.bufferFactory()
                                            .wrap(bytes);
                                        return super.writeWith(Mono.just(wrappedBuffer));
                                    });
                            }
                        };

                        return chain.filter(exchange.mutate().response(decorator).build());
                    }));
            })
            .switchIfEmpty(
                // Key no existe en Redis — primera vez
                redisTemplate.opsForValue()
                    .set(redisKey, "processing", IDEMPOTENCY_TTL)
                    .then(Mono.defer(() -> {
                        ServerHttpResponse originalResponse = exchange.getResponse();
                        ServerHttpResponseDecorator decorator = new ServerHttpResponseDecorator(originalResponse) {
                            @Override
                            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                                return DataBufferUtils.join(Flux.from(body))
                                    .flatMap(dataBuffer -> {
                                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                                        dataBuffer.read(bytes);
                                        DataBufferUtils.release(dataBuffer);

                                        String responseBody = new String(bytes, StandardCharsets.UTF_8);
                                        HttpStatus status = (HttpStatus) getStatusCode();
                                        if (status != null && status.is2xxSuccessful()) {
                                            redisTemplate.opsForValue()
                                                .set(redisKey, responseBody, IDEMPOTENCY_TTL)
                                                .subscribe();
                                        } else {
                                            redisTemplate.delete(redisKey).subscribe();
                                        }

                                        DataBuffer wrappedBuffer = originalResponse.bufferFactory().wrap(bytes);
                                        return super.writeWith(Mono.just(wrappedBuffer));
                                    });
                            }
                        };
                        return chain.filter(exchange.mutate().response(decorator).build());
                    }))
            );
    }

    @Override
    public int getOrder() {
        return -3;
    }
}
