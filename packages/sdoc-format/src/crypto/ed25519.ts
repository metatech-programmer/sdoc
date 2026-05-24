/**
 * Firma Ed25519 — usa Web Crypto API (Node 20+, navegadores 2024+).
 *
 * Algoritmo: Ed25519 (RFC 8032).
 * Las claves se manejan en formato **raw** (32 bytes pub, 32 bytes priv);
 * dentro de Web Crypto se importan como JWK / raw / pkcs8 según el caso.
 *
 * IMPORTANTE: Web Crypto Ed25519 quedó stable en Node 20.x. Si corres en
 * Node <20, esta lib lanza al usarla.
 */

import {
  asBufferSource,
  base64ToBytes,
  bytesToBase64,
  sha256Hex,
  timingSafeEqual,
} from "../utils/hash.js";

function subtle(): SubtleCrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API no disponible (requiere Node 20+ o navegador moderno).");
  }
  return c.subtle;
}

export interface Ed25519KeyPair {
  /** Clave pública (32 bytes, base64). */
  publicKey: string;
  /** Clave privada (32 bytes seed, base64). NUNCA la persistas sin cifrar. */
  privateKey: string;
}

/**
 * Genera un par de claves Ed25519 nuevo.
 * Las claves se devuelven en formato **raw** base64 (32 bytes cada una).
 */
export async function generateKeyPair(): Promise<Ed25519KeyPair> {
  const keyPair = (await subtle().generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const publicKeyRaw = await subtle().exportKey("raw", keyPair.publicKey);
  // La privada se exporta en JWK porque "raw" no funciona para private en Ed25519
  const privateJwk = await subtle().exportKey("jwk", keyPair.privateKey);
  if (!privateJwk.d) throw new Error("No se pudo exportar la clave privada");

  // jwk.d es base64url, lo normalizamos a base64 estándar
  const privBytes = base64UrlToBytes(privateJwk.d);

  return {
    publicKey: bytesToBase64(new Uint8Array(publicKeyRaw)),
    privateKey: bytesToBase64(privBytes),
  };
}

/**
 * Firma un mensaje con Ed25519.
 *
 * Web Crypto requiere tanto la semilla privada (`d`) como la clave pública
 * (`x`) para construir el JWK. Por eso esta API recibe ambas. Guarda las dos
 * juntas cuando generes el keypair con `generateKeyPair()`.
 *
 * @param message bytes a firmar
 * @param privateKeyBase64 clave privada raw (32 bytes seed) en base64
 * @param publicKeyBase64 clave pública raw (32 bytes) en base64
 * @returns firma (64 bytes) en base64
 */
export async function sign(
  message: Uint8Array,
  privateKeyBase64: string,
  publicKeyBase64: string
): Promise<string> {
  const privBytes = base64ToBytes(privateKeyBase64);
  const pubBytes = base64ToBytes(publicKeyBase64);
  if (privBytes.length !== 32) {
    throw new Error(`Clave privada Ed25519 debe ser de 32 bytes, recibí ${privBytes.length}`);
  }
  if (pubBytes.length !== 32) {
    throw new Error(`Clave pública Ed25519 debe ser de 32 bytes, recibí ${pubBytes.length}`);
  }
  const key = await importPrivateKey(privBytes, pubBytes);
  const sig = await subtle().sign({ name: "Ed25519" }, key, asBufferSource(message));
  return bytesToBase64(new Uint8Array(sig));
}

/**
 * Verifica una firma Ed25519.
 * @param message bytes originales firmados
 * @param signatureBase64 firma (64 bytes) en base64
 * @param publicKeyBase64 clave pública raw (32 bytes) en base64
 */
export async function verify(
  message: Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const pubBytes = base64ToBytes(publicKeyBase64);
    const sigBytes = base64ToBytes(signatureBase64);
    if (pubBytes.length !== 32) return false;
    if (sigBytes.length !== 64) return false;
    const key = await subtle().importKey(
      "raw",
      asBufferSource(pubBytes),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await subtle().verify(
      { name: "Ed25519" },
      key,
      asBufferSource(sigBytes),
      asBufferSource(message)
    );
  } catch {
    return false;
  }
}

/** Fingerprint (sha256:hex) de una clave pública Ed25519 (base64 raw). */
export async function publicKeyFingerprint(publicKeyBase64: string): Promise<string> {
  const bytes = base64ToBytes(publicKeyBase64);
  return "sha256:" + (await sha256Hex(bytes));
}

/** Compara dos firmas en tiempo constante (no usar `===`). */
export function signaturesEqual(a: string, b: string): boolean {
  try {
    return timingSafeEqual(base64ToBytes(a), base64ToBytes(b));
  } catch {
    return false;
  }
}

// ============================================================
// Internals
// ============================================================

async function importPrivateKey(
  rawSeed32: Uint8Array,
  rawPub32: Uint8Array
): Promise<CryptoKey> {
  // Web Crypto Ed25519 requiere JWK con `d` (seed) Y `x` (pubkey), ambos en
  // base64url. Si solo se pasa `d`, lanza "Invalid JWK".
  const jwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    d: bytesToBase64Url(rawSeed32),
    x: bytesToBase64Url(rawPub32),
  };
  return subtle().importKey("jwk", jwk, { name: "Ed25519" }, false, ["sign"]);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 =
    b64url.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64url.length % 4)) % 4);
  return base64ToBytes(b64);
}
