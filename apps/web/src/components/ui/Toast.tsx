/**
 * Toast system minimal — sin deps externas.
 * Cola FIFO, auto-dismiss 4s, accesible (role="status").
 */
import { create } from "zustand";
import { useEffect } from "react";
import { Check, X } from "./Icon";
import styles from "./Toast.module.css";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push("success", msg),
  error: (msg: string) => useToastStore.getState().push("error", msg),
  info: (msg: string) => useToastStore.getState().push("info", msg),
};

export function ToastViewport() {
  const { items, dismiss } = useToastStore();

  // Anuncia para screen readers
  useEffect(() => {
    if (items.length > 0) {
      const live = document.getElementById("folio-live");
      if (live) live.textContent = items[items.length - 1].message;
    }
  }, [items]);

  return (
    <>
      <div id="folio-live" aria-live="polite" aria-atomic="true" className={styles.sr} />
      <div className={styles.viewport}>
        {items.map((t) => (
          <div key={t.id} role="status" className={`${styles.toast} ${styles[t.kind]}`}>
            <span className={styles.iconWrap}>
              {t.kind === "success" ? <Check width={18} height={18} /> : <X width={18} height={18} />}
            </span>
            <span className={styles.msg}>{t.message}</span>
            <button
              type="button"
              className={styles.close}
              aria-label="Cerrar"
              onClick={() => dismiss(t.id)}
            >
              <X width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
