package app.sdoc.sync.model;

import java.time.Instant;

/**
 * Mensaje interno del protocolo de sincronización CRDT.
 * Los mensajes binarios contienen actualizaciones Yjs; los de texto contienen awareness JSON.
 */
public record SyncMessage(
    String documentId,
    String userId,
    Type type,
    byte[] payload,
    Instant timestamp
) {
    public enum Type {
        /** Actualización binaria Yjs (delta CRDT) */
        UPDATE,
        /** Estado de awareness del usuario (cursor, selección, presencia) */
        AWARENESS,
        /** Usuario conectado al documento */
        CONNECT,
        /** Usuario desconectado del documento */
        DISCONNECT
    }

    public static SyncMessage update(String documentId, String userId, byte[] yjsUpdate) {
        return new SyncMessage(documentId, userId, Type.UPDATE, yjsUpdate, Instant.now());
    }

    public static SyncMessage awareness(String documentId, String userId, byte[] awarenessJson) {
        return new SyncMessage(documentId, userId, Type.AWARENESS, awarenessJson, Instant.now());
    }

    public static SyncMessage connect(String documentId, String userId) {
        return new SyncMessage(documentId, userId, Type.CONNECT, new byte[0], Instant.now());
    }

    public static SyncMessage disconnect(String documentId, String userId) {
        return new SyncMessage(documentId, userId, Type.DISCONNECT, new byte[0], Instant.now());
    }
}
