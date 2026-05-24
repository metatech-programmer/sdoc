/**
 * Helpers de hashing y codificación.
 * Usa Web Crypto API (disponible nativo en Node 20+, navegadores modernos).
 */

function getSubtle(): SubtleCrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c || !c.subtle) {
    throw new Error(
      "Web Crypto SubtleCrypto no disponible. Necesitas Node 20+ o navegador moderno."
    );
  }
  return c.subtle;
}

/**
 * Wrapper: copia los bytes a un ArrayBuffer puro.
 * Necesario para satisfacer el tipo BufferSource estricto que Web Crypto
 * exige en @types/node 20.14+ y TS 5.7+ (Uint8Array<ArrayBufferLike> no
 * encaja directo en BufferSource).
 */
export function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

/** SHA-256 de bytes → ArrayBuffer. */
export async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
  return getSubtle().digest("SHA-256", asBufferSource(data));
}

/** SHA-256 de bytes → hex lowercase (64 chars). */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buf = await sha256(data);
  return bytesToHex(new Uint8Array(buf));
}

/** Conversión bytes → hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].toString(16);
    hex += b.length === 1 ? "0" + b : b;
  }
  return hex;
}

/** Conversión hex string → bytes. */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Hex debe tener longitud par");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Bytes → base64 (estándar, con padding). */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, Math.min(i + chunk, bytes.length))
      );
    }
    return globalThis.btoa(binary);
  }
  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B && typeof B.from === "function") {
    return B.from(bytes).toString("base64");
  }
  throw new Error("No hay btoa ni Buffer disponible para codificar a base64");
}

/** base64 (con o sin padding) → bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const bin = globalThis.atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B && typeof B.from === "function") {
    return new Uint8Array(B.from(b64, "base64"));
  }
  throw new Error("No hay atob ni Buffer disponible para decodificar base64");
}

/** Constantes-time equality para bytes (para comparar hashes/firmas). */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
