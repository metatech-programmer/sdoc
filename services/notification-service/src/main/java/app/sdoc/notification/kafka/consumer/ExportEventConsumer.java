package app.sdoc.notification.kafka.consumer;

import app.sdoc.commons.events.ExportCompletedEvent;
import app.sdoc.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExportEventConsumer {

    private final EmailService emailService;

    @KafkaListener(
        topics = "sdoc.exports.completed",
        groupId = "notification-service"
    )
    public void onExportCompleted(@Payload ExportCompletedEvent event, Acknowledgment ack) {
        try {
            log.info("Export completado: {} en formato {}", event.getExportId(), event.getFormat());
            if (event.getOwnerEmail() != null && !event.getOwnerEmail().isBlank()) {
                emailService.sendExportReadyEmail(
                    event.getOwnerEmail(),
                    event.getDocumentTitle() != null ? event.getDocumentTitle() : "Documento",
                    event.getDownloadUrl()
                );
            }
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error procesando ExportCompleted {}: {}", event.getExportId(), e.getMessage());
            throw new RuntimeException("Fallo procesando ExportCompleted " + event.getExportId(), e);
        }
    }
}
