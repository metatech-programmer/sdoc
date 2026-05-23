package app.sdoc.commons.outbox;

import app.sdoc.commons.events.DomainEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persiste eventos en la tabla outbox dentro de la misma transacción del caso de uso.
 * DEBE llamarse siempre dentro de una transacción activa (MANDATORY).
 * El OutboxPoller se encarga de publicar a Kafka de forma asíncrona.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(DomainEvent event, String kafkaTopic) {
        try {
            OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateType(event.getAggregateType())
                .aggregateId(event.getAggregateId())
                .eventType(event.getEventType())
                .payload(objectMapper.convertValue(event, Object.class))
                .kafkaTopic(kafkaTopic)
                .build();

            outboxRepository.save(outboxEvent);
            log.debug("Evento guardado en outbox: {} para aggregado {}",
                event.getEventType(), event.getAggregateId());

        } catch (Exception e) {
            log.error("Error al persistir evento en outbox: {}", event.getEventType(), e);
            throw new RuntimeException("Error al guardar evento en outbox", e);
        }
    }
}
