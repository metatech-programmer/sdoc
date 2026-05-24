/**
 * ULID generator — implementación compatible con la spec original.
 * Sin dependencias externas. Usa `crypto.getRandomValues` (Web Crypto).
 *
 * Formato: timestamp (10 chars Crockford-base32) + randomness (16 chars).
 * Spec: https://github.com/ulid/spec
 */

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function getCrypto(): Crypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error(
      "Web Crypto API no disponible. Necesitas Node 20+ o un navegador moderno."
    );
  }
  return c;
}

function encodeTime(now: number, len: number): string {
  if (!Number.isFinite(now) || now < 0 || now > 281474976710655) {
    throw new Error(`ULID: timestamp fuera de rango (${now})`);
  }
  let str = "";
  let n = now;
  for (let i = len - 1; i >= 0; i--) {
    const mod = n % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    n = (n - mod) / ENCODING_LEN;
  }
  return str;
}

function encodeRandom(len: number): string {
  const c = getCrypto();
  const buf = new Uint8Array(len);
  c.getRandomValues(buf);
  let str = "";
  for (let i = 0; i < len; i++) {
    str += ENCODING.charAt(buf[i] % ENCODING_LEN);
  }
  return str;
}

/** Genera un ULID nuevo (26 chars Crockford-base32). */
export function ulid(timestamp: number = Date.now()): string {
  return encodeTime(timestamp, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

/** Genera un ID de documento (`doc_<ulid>`). */
export function documentId(): string {
  return "doc_" + ulid();
}

/** Genera un ID de usuario (`usr_<ulid>`). */
export function userId(): string {
  return "usr_" + ulid();
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Verifica si una cadena tiene el formato ULID válido (sin prefijo). */
export function isUlid(value: string): boolean {
  return ULID_RE.test(value);
}
