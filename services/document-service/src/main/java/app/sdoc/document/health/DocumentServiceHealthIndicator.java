package app.sdoc.document.health;

import app.sdoc.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health indicator personalizado para el document-service.
 * Verifica PostgreSQL, Redis y conectividad con Kafka.
 */
@Component
@RequiredArgsConstructor
public class DocumentServiceHealthIndicator implements HealthIndicator {

    private final DocumentRepository documentRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public Health health() {
        Map<String, Object> details = new LinkedHashMap<>();
        boolean healthy = true;

        // Verificar PostgreSQL
        try {
            documentRepository.count();
            details.put("database", "UP");
        } catch (Exception e) {
            details.put("database", "DOWN: " + e.getMessage());
            healthy = false;
        }

        // Verificar Redis
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            details.put("redis", "UP");
        } catch (Exception e) {
            details.put("redis", "DOWN: " + e.getMessage());
            healthy = false;
        }

        // Verificar Kafka (degradado no hace el servicio unhealthy para readiness)
        try {
            kafkaTemplate.getProducerFactory().createProducer()
                    .partitionsFor("sdoc.documents.created");
            details.put("kafka", "UP");
        } catch (Exception e) {
            details.put("kafka", "DEGRADED: " + e.getMessage());
        }

        return healthy
                ? Health.up().withDetails(details).build()
                : Health.down().withDetails(details).build();
    }
}
