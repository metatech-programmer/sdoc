/**
 * Canonicalización de JSON — variante simplificada de RFC 8785 (JCS).
 *
 * Reglas:
 *  - Claves de objeto ordenadas lexicográficamente (UTF-16 code units, como JSON.stringify).
 *  - Sin espacios en blanco entre tokens.
 *  - Strings con escape mínimo de JSON.stringify (válido y determinista).
 *  - `undefined` se omite (igual que JSON.stringify).
 *  - Arrays preservan orden (RFC 8785 también lo hace).
 *
 * Usado para:
 *  - Calcular checksums reproducibles (manifest, document).
 *  - Construir el payload que se firma con Ed25519.
 */

import { sha256Hex } from "./hash.js";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json | undefined };

/** Convierte cualquier valor JSON-serializable a su forma canónica. */
export function canonicalize(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON: NaN e Infinity no son válidos");
    }
    // Number.toString() ya da forma canónica para enteros y notación normal.
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(JSON.stringify(k) + ":" + stringify(obj[k]));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`canonical JSON: tipo no soportado (${typeof value})`);
}

/** SHA-256 (hex) del JSON canónico del valor. Devuelve `sha256:<hex>`. */
export async function canonicalChecksum(value: unknown): Promise<string> {
  const canonical = canonicalize(value);
  return "sha256:" + (await sha256Hex(new TextEncoder().encode(canonical)));
}
