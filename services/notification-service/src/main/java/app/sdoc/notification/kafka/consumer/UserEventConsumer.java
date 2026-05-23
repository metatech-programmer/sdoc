package app.sdoc.notification.kafka.consumer;

import app.sdoc.commons.events.UserRegisteredEvent;
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
public class UserEventConsumer {

    private final EmailService emailService;

    @KafkaListener(
        topics = "sdoc.users.registered",
        groupId = "notification-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onUserRegistered(@Payload UserRegisteredEvent event, Acknowledgment ack) {
        try {
            emailService.sendWelcomeEmail(event.getEmail(), event.getFullName());
            log.info("Email de bienvenida enviado a {}", event.getEmail());
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error al procesar UserRegistered para {}: {}", event.getEmail(), e.getMessage());
            // Relanzar para que DefaultErrorHandler reintente y enrute al DLQ tras 3 fallos
            throw new RuntimeException("Fallo enviando email de bienvenida a " + event.getEmail(), e);
        }
    }
}
