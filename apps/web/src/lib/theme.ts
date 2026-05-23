/**
 * Theme store — light/dark/system con persistencia.
 * Aplica .dark / .light al <html> y respeta prefers-color-scheme cuando "system".
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: () => "light" | "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(isDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      resolved: () => {
        const t = get().theme;
        if (t !== "system") return t;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      },
    }),
    {
      name: "folio.theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

/** Re-aplica si el SO cambia y el modo es "system". */
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") applyTheme("system");
  });
}
