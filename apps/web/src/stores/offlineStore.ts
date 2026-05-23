import { create } from "zustand";

interface OfflineState {
  isOnline: boolean;
  pendingOpsCount: number;
  setOnline: (online: boolean) => void;
  setPendingOpsCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: navigator.onLine,
  pendingOpsCount: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setPendingOpsCount: (pendingOpsCount) => set({ pendingOpsCount }),
}));

// Listeners globales de conectividad
window.addEventListener("online", () => {
  useOfflineStore.getState().setOnline(true);
});
window.addEventListener("offline", () => {
  useOfflineStore.getState().setOnline(false);
});
