/**
 * i18n minimal — sin deps externas.
 * Soporta es-CO (default), en, pt-BR.
 * Cambia idioma con setLocale() y re-renderiza vía useLocaleStore.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import es from "../i18n/locales/es-CO";
import en from "../i18n/locales/en";
import pt from "../i18n/locales/pt-BR";

export type Locale = "es-CO" | "en" | "pt-BR";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "es-CO", label: "Español (Colombia)", flag: "🇨🇴" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
];

const dictionaries: Record<Locale, Record<string, string>> = {
  "es-CO": es,
  en,
  "pt-BR": pt,
};

interface LocaleStore {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "es-CO";
  const browser = navigator.language || "es-CO";
  if (browser.toLowerCase().startsWith("es")) return "es-CO";
  if (browser.toLowerCase().startsWith("pt")) return "pt-BR";
  return "en";
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: detectInitialLocale(),
      setLocale: (locale) => {
        document.documentElement.lang = locale;
        set({ locale });
      },
    }),
    { name: "sdoc.locale" }
  )
);

/**
 * Traduce. Soporta placeholders {name} → values.name.
 */
export function t(key: string, values?: Record<string, string | number>): string {
  const locale = useLocaleStore.getState().locale;
  let str = dictionaries[locale]?.[key] ?? dictionaries["es-CO"][key] ?? key;
  if (values) {
    for (const k in values) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(values[k]));
    }
  }
  return str;
}

/**
 * Hook reactivo: re-renderiza cuando cambia el locale.
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (key: string, values?: Record<string, string | number>) => {
    let str = dictionaries[locale]?.[key] ?? dictionaries["es-CO"][key] ?? key;
    if (values) {
      for (const k in values) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(values[k]));
      }
    }
    return str;
  };
}
