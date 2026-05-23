package app.sdoc.sync.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registro en memoria de sesiones WebSocket activas por documento.
 * En producción multi-instancia, usar Redis pub/sub para sincronizar entre pods.
 */
@Component
@Slf4j
public class SyncSessionRegistry {

    // documentId -> (userId -> WebSocketSession)
    private final Map<String, Map<String, WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public void addSession(String documentId, String userId, WebSocketSession session) {
        sessions.computeIfAbsent(documentId, k -> new ConcurrentHashMap<>())
            .put(userId, session);
        log.debug("Sesión registrada: doc={}, usuario={}, total sesiones doc={}",
            documentId, userId, sessions.get(documentId).size());
    }

    public void removeSession(String documentId, String userId) {
        Map<String, WebSocketSession> docSessions = sessions.get(documentId);
        if (docSessions != null) {
            docSessions.remove(userId);
            if (docSessions.isEmpty()) {
                sessions.remove(documentId);
            }
        }
    }

    public Map<String, WebSocketSession> getSessions(String documentId) {
        return sessions.getOrDefault(documentId, Collections.emptyMap());
    }

    public int getActiveDocumentCount() {
        return sessions.size();
    }

    public int getTotalSessionCount() {
        return sessions.values().stream().mapToInt(Map::size).sum();
    }
}
