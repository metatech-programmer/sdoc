package app.sdoc.version.kafka.consumer;

import app.sdoc.commons.events.DocumentUpdatedEvent;
import app.sdoc.version.service.VersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentEventConsumer {

    private final VersionService versionService;

    @KafkaListener(
        topics = "sdoc.documents.updated",
        groupId = "version-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onDocumentUpdated(@Payload DocumentUpdatedEvent event, Acknowledgment ack) {
        try {
            log.info("Evento de actualización recibido para documento {}, versión {}",
                event.getDocumentId(), event.getNewVersion());

            Integer newVersion = event.getNewVersion();
            if (newVersion != null && versionService.shouldCreateSnapshot(event.getDocumentId(), newVersion)) {
                log.info("Creando snapshot automático para documento {} v{}", event.getDocumentId(), newVersion);
                versionService.createSnapshot(
                    event.getDocumentId(),
                    event.getTitle(),
                    null,  // contentJson se obtiene bajo demanda si se necesita
                    event.getUpdatedById(),
                    "Auto-snapshot v" + newVersion
                );
            }

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error procesando DocumentUpdated para {}: {}",
                event.getDocumentId(), e.getMessage(), e);
        }
    }
}
