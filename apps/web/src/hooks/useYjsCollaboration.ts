import { useEffect, useRef, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useAuthStore } from "../stores/authStore";
import { useDocumentStore } from "../stores/documentStore";
import { isDemoMode } from "../services/demo";

const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8085";

const CURSOR_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#34d399",
  "#60a5fa", "#a78bfa", "#f472b6", "#38bdf8",
];

function randomColor(): string {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

interface UseYjsCollaborationOptions {
  documentId: string;
  enabled?: boolean;
}

interface YjsCollaboration {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
}

/**
 * Configura la colaboración Yjs+WebSocket para un documento.
 * En demo mode, retorna un Y.Doc local sin conectarse a WebSocket
 * (evita errores NS_ERROR_CONNECTION_REFUSED cuando no hay backend).
 */
export function useYjsCollaboration({
  documentId,
  enabled = true,
}: UseYjsCollaborationOptions): YjsCollaboration {
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.fullName);
  const token = useAuthStore((s) => s.accessToken);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  const color = useMemo(() => randomColor(), []);

  useEffect(() => {
    // En demo mode no intentamos conectar a Yjs WebSocket
    if (isDemoMode()) return;
    if (!enabled || !token || !documentId) return;

    const ydoc = ydocRef.current;
    const wsUrl = `${WS_BASE}/ws/sync/${documentId}?token=${token}`;

    let provider: WebsocketProvider;
    try {
      provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
        connect: true,
      });
    } catch {
      return;
    }

    provider.awareness.setLocalStateField("user", {
      id: userId ?? "anon",
      name: userName ?? "Usuario",
      color,
    });

    // Sincroniza awareness remoto con el store leyendo directamente el state
    // (no desestructuramos métodos para evitar bucles de re-render).
    const onAwarenessChange = ({
      added,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const states = provider.awareness.getStates();
      const store = useDocumentStore.getState();

      added.forEach((clientId) => {
        const state = states.get(clientId);
        if (state?.user && state.user.id !== (userId ?? "anon")) {
          store.addCollaborator({
            userId: state.user.id,
            name: state.user.name ?? "Usuario",
            color: state.user.color ?? "#60a5fa",
          });
        }
      });

      removed.forEach((clientId) => {
        states.forEach((state) => {
          if (state?.user?.clientId === clientId) {
            store.removeCollaborator(state.user.id);
          }
        });
      });
    };

    provider.awareness.on("change", onAwarenessChange);
    providerRef.current = provider;

    return () => {
      provider.awareness.off("change", onAwarenessChange);
      provider.destroy();
      providerRef.current = null;
      useDocumentStore.getState().clearCollaborators();
    };
  }, [documentId, token, enabled, userId, userName, color]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    isConnected: providerRef.current?.wsconnected ?? false,
  };
}
