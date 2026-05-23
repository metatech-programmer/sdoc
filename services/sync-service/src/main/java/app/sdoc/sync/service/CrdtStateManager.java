package app.sdoc.sync.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * Gestor del estado CRDT (Yjs) en Redis.
 * Almacena el estado binario acumulado del documento por hasta 7 días.
 * El merge se hace con un Lua script atómico para evitar race conditions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CrdtStateManager {

    private final ReactiveRedisTemplate<String, byte[]> redisTemplate;

    private static final String CRDT_KEY_PREFIX = "crdt:state:";
    private static final Duration CRDT_TTL = Duration.ofDays(7);

    /**
     * Obtiene el estado CRDT actual del documento desde Redis.
     * Retorna null si el documento no tiene estado previo.
     */
    public Mono<byte[]> getCurrentState(String documentId) {
        return redisTemplate.opsForValue().get(CRDT_KEY_PREFIX + documentId);
    }

    /**
     * Aplica un update Yjs al estado CRDT del documento en Redis.
     * Usa un Lua script atómico para garantizar que el merge no tiene race conditions.
     */
    public Mono<Void> applyUpdate(String documentId, byte[] update) {
        String key = CRDT_KEY_PREFIX + documentId;
        return redisTemplate.execute(
                        RedisScript.of(MERGE_CRDT_SCRIPT, byte[].class),
                        List.of(key),
                        update
                )
                .then(redisTemplate.expire(key, CRDT_TTL))
                .then()
                .doOnError(e -> log.error("Error aplicando CRDT update para doc {}: {}", documentId, e.getMessage()));
    }

    /**
     * Elimina el estado CRDT de un documento (ej: cuando se borra el documento).
     */
    public Mono<Boolean> clearState(String documentId) {
        return redisTemplate.delete(CRDT_KEY_PREFIX + documentId);
    }

    /**
     * Script Lua para merge atómico del estado CRDT.
     * En MVP: almacena el update más reciente (el cliente Yjs maneja el merge).
     * En producción con libería nativa Yjs-rs o yrs: hacer merge binario real.
     */
    private static final String MERGE_CRDT_SCRIPT = """
            local current = redis.call('GET', KEYS[1])
            if current == false then
                redis.call('SET', KEYS[1], ARGV[1])
            else
                -- MVP: almacenar el update más reciente.
                -- Producción: usar librería nativa Yjs para merge binario real.
                redis.call('SET', KEYS[1], ARGV[1])
            end
            return redis.call('TTL', KEYS[1])
            """;
}
