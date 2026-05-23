/**
 * Utilidades de formato — Colombia first, multi-locale ready.
 * Maneja moneda (COP/USD/EUR/BRL), fechas (es-CO timezone Bogotá),
 * tiempo relativo, tamaño de archivo, números.
 */
import type { Locale } from "./i18n";

const LOCALE_TO_BCP47: Record<Locale, string> = {
  "es-CO": "es-CO",
  en: "en-US",
  "pt-BR": "pt-BR",
};

export type Currency = "COP" | "USD" | "EUR" | "BRL";

/** USD reference rate (visual only — mock para demo). En prod: API TRM diaria. */
export const USD_TO_COP = 4100;
export const COP_TO_EUR = 1 / 4400;
export const COP_TO_BRL = 1 / 800;

export function convertFromCOP(amountCOP: number, to: Currency): number {
  switch (to) {
    case "COP": return amountCOP;
    case "USD": return amountCOP / USD_TO_COP;
    case "EUR": return amountCOP * COP_TO_EUR;
    case "BRL": return amountCOP * COP_TO_BRL;
  }
}

/**
 * Formatea moneda con símbolo localizado.
 * COP: "$ 39.000" (sin decimales, separador miles "."), Colombia
 * USD: "$9.50" (decimales)
 */
export function formatCurrency(
  amount: number,
  currency: Currency = "COP",
  locale: Locale = "es-CO"
): string {
  const bcp = LOCALE_TO_BCP47[locale];
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
  };
  return new Intl.NumberFormat(bcp, opts).format(amount);
}

/** IVA 19% Colombia. */
export const IVA_RATE = 0.19;

export interface InvoiceBreakdown {
  subtotal: number;
  iva: number;
  total: number;
  currency: Currency;
}

/**
 * Calcula desglose con IVA del 19% para precios mostrados.
 * Asume que `amount` es precio FINAL al usuario (IVA incluido).
 */
export function calcInvoice(totalWithIva: number, currency: Currency = "COP"): InvoiceBreakdown {
  const subtotal = totalWithIva / (1 + IVA_RATE);
  const iva = totalWithIva - subtotal;
  return {
    subtotal: Math.round(subtotal),
    iva: Math.round(iva),
    total: totalWithIva,
    currency,
  };
}

/** Formato fecha corto: "15 may 2026" (es-CO) */
export function formatDate(date: Date | string, locale: Locale = "es-CO"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_TO_BCP47[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(d);
}

/** Formato hora: "14:30" */
export function formatTime(date: Date | string, locale: Locale = "es-CO"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_TO_BCP47[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(d);
}

/** Tiempo relativo: "hace 5 min", "ayer", "hace 3 días" */
export function formatRelative(date: Date | string, locale: Locale = "es-CO"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  const rtf = new Intl.RelativeTimeFormat(LOCALE_TO_BCP47[locale], { numeric: "auto" });
  if (diffMin < 1) return rtf.format(0, "minute");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffH < 24) return rtf.format(-diffH, "hour");
  if (diffD < 30) return rtf.format(-diffD, "day");
  return formatDate(d, locale);
}

/** Bytes → "1.5 MB", "240 KB", "1 GB" */
export function formatBytes(bytes: number, locale: Locale = "es-CO"): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${new Intl.NumberFormat(LOCALE_TO_BCP47[locale], { maximumFractionDigits: 1 }).format(value)} ${units[i]}`;
}

/** Número con separadores: 1.234.567 (es-CO) / 1,234,567 (en) */
export function formatNumber(n: number, locale: Locale = "es-CO"): string {
  return new Intl.NumberFormat(LOCALE_TO_BCP47[locale]).format(n);
}
