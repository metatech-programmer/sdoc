package app.sdoc.notification.kafka.consumer;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumer de Dead Letter Queues para monitoreo de mensajes fallidos.
 * Cada mensaje en el DLQ representa un error que requiere atención inmediata.
 * En producción: integrar con Slack/PagerDuty para alertas automáticas.
 */
@Component
@Slf4j
public class DlqConsumer {

    @KafkaListener(
            topics = {
                    "sdoc.documents.created.dlq",
                    "sdoc.exports.requested.dlq",
                    "sdoc.notifications.send.dlq",
                    "sdoc.users.registered.dlq"
            },
            groupId = "dlq-monitor-group"
    )
    public void onDlqMessage(ConsumerRecord<String, String> record) {
        log.error(
                "MENSAJE EN DLQ — topic: {}, partition: {}, offset: {}, key: {}, value: {}",
                record.topic(),
                record.partition(),
                record.offset(),
                record.key(),
                record.value()
        );
        // TODO producción: alertar via Slack/PagerDuty
        // alertingService.sendDlqAlert(record);
    }
}
