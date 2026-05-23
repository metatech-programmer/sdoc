package app.sdoc.sync.handler;

import app.sdoc.sync.kafka.producer.KafkaSyncProducer;
import app.sdoc.sync.service.SyncSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

/**
 * Handler WebSocket para sincronización CRDT en tiempo real.
 * Protocolo:
 * - Mensajes binarios: Yjs updates (CRDT) — se broadcast y se publican a Kafka
 * - Mensajes de texto: JSON de awareness (cursores, selección) — solo broadcast local
 * - Auth: JWT en query param ?token={jwt} (browsers no soportan headers en WS handshake)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SyncWebSocketHandler extends AbstractWebSocketHandler {

    private final SyncSessionRegistry sessionRegistry;
    private final KafkaSyncProducer kafkaSyncProducer;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String documentId = extractDocumentId(session);
        String userId = extractUserId(session);

        if (userId == null) {
            log.warn("Conexión WS rechazada — sin token JWT válido");
            try { session.close(CloseStatus.POLICY_VIOLATION); } catch (Exception ignored) {}
            return;
        }

        sessionRegistry.addSession(documentId, userId, session);
        log.info("Nueva sesión sync: usuario {} en documento {}", userId, documentId);
        broadcastAwareness(documentId, session, userId, "join");
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        String documentId = extractDocumentId(session);
        String userId = extractUserId(session);

        // Reenviar Yjs update a todos los demás en el mismo documento
        sessionRegistry.getSessions(documentId).forEach((uid, s) -> {
            if (!s.getId().equals(session.getId()) && s.isOpen()) {
                try {
                    s.sendMessage(message);
                } catch (Exception e) {
                    log.warn("Error al reenviar update a sesión {}: {}", s.getId(), e.getMessage());
                }
            }
        });

        // Publicar a Kafka para persistencia del estado CRDT y auditoría
        if (userId != null) {
            byte[] payload = new byte[message.getPayload().remaining()];
            message.getPayload().duplicate().get(payload);
            kafkaSyncProducer.publishSyncOperation(documentId, userId, payload);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String documentId = extractDocumentId(session);

        // Reenviar awareness (cursores, presencia) — no va a Kafka porque es efímero
        sessionRegistry.getSessions(documentId).forEach((uid, s) -> {
            if (!s.getId().equals(session.getId()) && s.isOpen()) {
                try {
                    s.sendMessage(message);
                } catch (Exception e) {
                    log.warn("Error al reenviar awareness: {}", e.getMessage());
                }
            }
        });
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String documentId = extractDocumentId(session);
        String userId = extractUserId(session);

        sessionRegistry.removeSession(documentId, userId);
        broadcastAwareness(documentId, session, userId, "leave");
        log.info("Sesión sync cerrada: usuario {} en documento {}", userId, documentId);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("Error de transporte WebSocket en sesión {}: {}", session.getId(), exception.getMessage());
    }

    private void broadcastAwareness(String documentId, WebSocketSession senderSession,
                                    String userId, String event) {
        String awareness = "{\"type\":\"awareness\",\"event\":\"%s\",\"userId\":\"%s\"}"
            .formatted(event, userId);

        sessionRegistry.getSessions(documentId).forEach((uid, s) -> {
            if (!s.getId().equals(senderSession.getId()) && s.isOpen()) {
                try {
                    s.sendMessage(new TextMessage(awareness));
                } catch (Exception ignored) {}
            }
        });
    }

    private String extractDocumentId(WebSocketSession session) {
        String path = session.getUri() != null ? session.getUri().getPath() : "";
        String[] parts = path.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : "unknown";
    }

    private String extractUserId(WebSocketSession session) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("token=")) {
                return extractSubFromJwt(param.substring(6));
            }
        }
        return null;
    }

    private String extractSubFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            String sub = payload.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
            return sub.equals(payload) ? null : sub;
        } catch (Exception e) {
            return null;
        }
    }
}
