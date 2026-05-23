package app.sdoc.sync.kafka.producer;

import app.sdoc.commons.events.SyncOperationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaSyncProducer {

    private static final String TOPIC = "sdoc.sync.operations";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Publica una operación de sincronización CRDT a Kafka.
     * La clave de partición es el documentId para mantener orden por documento.
     */
    public void publishSyncOperation(String documentId, String userId, byte[] yjsUpdate) {
        SyncOperationEvent event = new SyncOperationEvent(
            documentId,
            UUID.randomUUID().toString(),  // sessionId único por operación
            userId,
            yjsUpdate,
            "UPDATE"
        );

        kafkaTemplate.send(TOPIC, documentId, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Error publicando sync operation para doc {}: {}", documentId, ex.getMessage());
                } else {
                    log.debug("Sync operation publicada para doc {} en partición {}",
                        documentId, result.getRecordMetadata().partition());
                }
            });
    }
}
