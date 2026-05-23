import { useCallback, useEffect, useRef } from "react";
import { useDocumentStore } from "../stores/documentStore";
import { useOfflineStore } from "../stores/offlineStore";
import { documentsApi } from "../services/api";
import { saveDraft, loadDraft, deleteDraft, getAllDrafts } from "../services/offline";

const DEBOUNCE_MS = 3_000;

/**
 * Guarda automáticamente el contenido del editor cada 3 segundos.
 * Si no hay conexión, persiste en IndexedDB como borrador.
 * Al reconectar, sincroniza todos los borradores pendientes.
 */
export function useAutoSave(documentId: string | undefined) {
  // Usamos getState() directamente para no depender de referencias de método
  // que cambian cada render (evita re-render loops).
  const isOnline = useOfflineStore((s) => s.isOnline);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevOnlineRef = useRef<boolean>(isOnline);

  const scheduleAutoSave = useCallback(
    (content: unknown) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (!documentId) return;

        if (!isOnline) {
          await saveDraft(documentId, content);
          return;
        }

        useDocumentStore.getState().markSaving();
        try {
          await documentsApi.update(documentId, content);
          await deleteDraft(documentId);
          useDocumentStore.getState().markSaved();
        } catch {
          await saveDraft(documentId, content);
        }
      }, DEBOUNCE_MS);
    },
    [documentId, isOnline]
  );

  // Al reconectar, sincronizar borradores pendientes en IndexedDB
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline || !wasOffline) return;

    async function syncPendingDrafts() {
      try {
        const drafts = await getAllDrafts();
        await Promise.allSettled(
          drafts.map(async (draft) => {
            try {
              await documentsApi.update(draft.documentId, draft.content);
              await deleteDraft(draft.documentId);
            } catch {
              // Mantener el borrador si falla — se reintentará en la próxima reconexión
            }
          })
        );
      } catch {
        // Sin acción — los borradores persisten en IndexedDB
      }
    }

    syncPendingDrafts();
  }, [isOnline]);

  // Intentar subir borrador local al montar si hay conexión
  useEffect(() => {
    if (!documentId || !isOnline) return;

    loadDraft(documentId).then(async (draft) => {
      if (!draft) return;
      try {
        await documentsApi.update(draft.documentId, draft.content);
        await deleteDraft(draft.documentId);
      } catch {
        // Mantener borrador
      }
    });
  }, [documentId, isOnline]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { scheduleAutoSave };
}
