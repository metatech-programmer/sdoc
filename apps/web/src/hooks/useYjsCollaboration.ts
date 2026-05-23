import { useEffect, useRef, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useAuthStore } from "../stores/authStore";
import { useDocumentStore } from "../stores/documentStore";

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
 * Pasa el JWT en el query param ya que los browsers no permiten
 * headers personalizados en el handshake WebSocket.
 * Sincroniza el estado de awareness con el documentStore.
 */
export function useYjsCollaboration({
  documentId,
  enabled = true,
}: UseYjsCollaborationOptions): YjsCollaboration {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const { addCollaborator, removeCollaborator, updateCollaboratorCursor, clearCollaborators } =
    useDocumentStore();
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  const color = useMemo(() => randomColor(), []);

  useEffect(() => {
    if (!enabled || !token || !documentId) return;

    const ydoc = ydocRef.current;
    const wsUrl = `${WS_BASE}/ws/sync/${documentId}?token=${token}`;

    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      connect: true,
    });

    // Estado de awareness: nombre y color del usuario actual
    provider.awareness.setLocalStateField("user", {
      id: user?.id ?? "anon",
      name: user?.fullName ?? "Usuario",
      color,
    });

    // Sincronizar awareness remoto con el store
    const onAwarenessChange = ({
      added,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const states = provider.awareness.getStates();

      added.forEach((clientId) => {
        const state = states.get(clientId);
        if (state?.user && state.user.id !== (user?.id ?? "anon")) {
          addCollaborator({
            userId: state.user.id,
            name: state.user.name ?? "Usuario",
            color: state.user.color ?? "#60a5fa",
          });
        }
      });

      removed.forEach((clientId) => {
        // clientId no mapea directo a userId — usamos el campo user.id del estado previo
        states.forEach((state) => {
          if (state?.user?.clientId === clientId) {
            removeCollaborator(state.user.id);
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
      clearCollaborators();
    };
  }, [documentId, token, enabled, user, color, addCollaborator, removeCollaborator, clearCollaborators]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    isConnected: providerRef.current?.wsconnected ?? false,
  };
}
