package app.sdoc.commons.outbox;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Poller del patrón Outbox.
 * Cada segundo lee eventos pendientes con lock pesimista y los publica a Kafka.
 * Garantiza exactly-once delivery desde la perspectiva de la DB.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPoller {

    private static final int BATCH_SIZE = 50;

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final MeterRegistry meterRegistry;

    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    @Transactional
    public void pollAndPublish() {
        List<OutboxEvent> pendingEvents = outboxRepository.findPendingEventsWithLock(BATCH_SIZE);

        if (pendingEvents.isEmpty()) return;

        log.debug("Procesando {} eventos outbox pendientes", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            publishEvent(event);
        }
    }

    private void publishEvent(OutboxEvent event) {
        try {
            CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(
                event.getKafkaTopic(),
                event.getAggregateId(),
                event.getPayload()
            );

            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Error al publicar evento {} en Kafka: {}",
                        event.getEventType(), ex.getMessage());
                    event.markAsFailed(ex.getMessage());
                    meterRegistry.counter("outbox.events.failed",
                        "eventType", event.getEventType()).increment();
                } else {
                    event.markAsSent();
                    meterRegistry.counter("outbox.events.sent",
                        "eventType", event.getEventType()).increment();
                    log.debug("Evento {} publicado en {}", event.getEventType(), event.getKafkaTopic());
                }
                outboxRepository.save(event);
            });

        } catch (Exception e) {
            log.error("Error inesperado al procesar evento outbox {}: {}",
                event.getId(), e.getMessage());
            event.markAsFailed(e.getMessage());
            outboxRepository.save(event);
        }
    }
}
