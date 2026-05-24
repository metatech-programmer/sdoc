/**
 * Cifrado AES-256-GCM con derivación de clave HKDF-SHA256.
 *
 * Sigue SPEC.md §9.3 (DocumentEncryptionService):
 *   - AES-GCM, key 256 bits, IV 12 bytes (96 bits), tag 128 bits.
 *   - HKDF-SHA256, info = "sdoc-v1:document:<documentId>:<hex(iv)>".
 *   - AAD opcional (recomendado: documentId).
 *
 * Web Crypto API soporta AES-GCM y HKDF nativamente.
 */

import {
  asBufferSource,
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  sha256Hex,
} from "../utils/hash.js";

function subtle(): SubtleCrypto {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto API no disponible (requiere Node 20+ o navegador moderno).");
  }
  return c.subtle;
}

function randomBytes(len: number): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: Crypto = (globalThis as any).crypto;
  const out = new Uint8Array(len);
  c.getRandomValues(out);
  return out;
}

export const IV_SIZE = 12;       // bytes — 96 bits, recomendado para GCM
export const TAG_SIZE = 16;      // bytes — 128 bits (incluido en ciphertext por Web Crypto)
export const KEY_SIZE = 32;      // bytes — 256 bits
export const DEFAULT_SALT_SIZE = 16;

export interface EncryptionInput {
  /** Bytes en plano a cifrar. */
  plaintext: Uint8Array;
  /** Clave maestra (en bytes). Normalmente derivada de la contraseña del usuario o de Vault. */
  masterKey: Uint8Array;
  /** Identificador único del documento (se usa en `info` HKDF y como AAD). */
  documentId: string;
  /** Salt HKDF opcional. Si no se pasa, se genera aleatorio. */
  salt?: Uint8Array;
  /** IV opcional. Si no se pasa, se genera aleatorio. */
  iv?: Uint8Array;
}

export interface EncryptionResult {
  /** Ciphertext (incluye el tag GCM al final) en base64. */
  ciphertext: string;
  /** IV (12 bytes) en base64. */
  iv: string;
  /** Salt HKDF (default 16 bytes) en base64. */
  salt: string;
  /** Cadena `info` exacta usada en HKDF. */
  info: string;
  /** SHA-256 (hex) del plaintext para verificación de integridad. */
  plaintextChecksum: string;
}

/**
 * Cifra `plaintext` con AES-256-GCM usando una clave derivada vía HKDF-SHA256.
 */
export async function encrypt(input: EncryptionInput): Promise<EncryptionResult> {
  const iv = input.iv ?? randomBytes(IV_SIZE);
  if (iv.length !== IV_SIZE) {
    throw new Error(`IV debe ser de ${IV_SIZE} bytes, recibí ${iv.length}`);
  }
  const salt = input.salt ?? randomBytes(DEFAULT_SALT_SIZE);
  const info = buildInfo(input.documentId, iv);
  const key = await deriveKey(input.masterKey, salt, info);
  const aad = new TextEncoder().encode(input.documentId);

  const ctBuf = await subtle().encrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(iv),
      additionalData: asBufferSource(aad),
      tagLength: TAG_SIZE * 8,
    },
    key,
    asBufferSource(input.plaintext)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ctBuf)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    info,
    plaintextChecksum: "sha256:" + (await sha256Hex(input.plaintext)),
  };
}

export interface DecryptionInput {
  ciphertext: string;
  iv: string;
  salt: string;
  info: string;
  masterKey: Uint8Array;
  documentId: string;
  /** Si se pasa, se valida tras descifrar. */
  expectedPlaintextChecksum?: string;
}

/**
 * Descifra y verifica integridad. Lanza si la clave es incorrecta o el
 * checksum del plaintext no coincide con `expectedPlaintextChecksum`.
 */
export async function decrypt(input: DecryptionInput): Promise<Uint8Array> {
  const iv = base64ToBytes(input.iv);
  const salt = base64ToBytes(input.salt);
  const ciphertext = base64ToBytes(input.ciphertext);

  // Verificación adicional: el info debería coincidir con el patrón esperado
  const expectedInfo = buildInfo(input.documentId, iv);
  if (input.info !== expectedInfo) {
    throw new Error(
      "encryption-meta.info no coincide con el patrón esperado para documentId+iv. " +
        "Posible alteración del archivo."
    );
  }

  const key = await deriveKey(input.masterKey, salt, expectedInfo);
  const aad = new TextEncoder().encode(input.documentId);

  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await subtle().decrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(iv),
        additionalData: asBufferSource(aad),
        tagLength: TAG_SIZE * 8,
      },
      key,
      asBufferSource(ciphertext)
    );
  } catch (cause) {
    throw new Error(
      "Descifrado falló: clave incorrecta o archivo corrupto/manipulado",
      { cause }
    );
  }

  const plaintext = new Uint8Array(plaintextBuf);

  if (input.expectedPlaintextChecksum) {
    const actual = "sha256:" + (await sha256Hex(plaintext));
    if (actual !== input.expectedPlaintextChecksum) {
      throw new Error(
        `Integridad fallida: checksum esperado ${input.expectedPlaintextChecksum}, calculado ${actual}`
      );
    }
  }

  return plaintext;
}

// ============================================================
// HKDF helpers
// ============================================================

/** Cadena `info` exacta según SPEC.md §9.3. */
export function buildInfo(documentId: string, iv: Uint8Array): string {
  return `sdoc-v1:document:${documentId}:${bytesToHex(iv)}`;
}

async function deriveKey(
  masterKey: Uint8Array,
  salt: Uint8Array,
  info: string
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey(
    "raw",
    asBufferSource(masterKey),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asBufferSource(salt),
      info: asBufferSource(new TextEncoder().encode(info)),
    },
    baseKey,
    { name: "AES-GCM", length: KEY_SIZE * 8 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Deriva una `masterKey` de 32 bytes a partir de una contraseña usando
 * PBKDF2 (porque HKDF asume entrada de alta entropía y una password no lo es).
 *
 * Devuelve los bytes crudos listos para usar con `encrypt`/`decrypt`.
 */
export async function deriveMasterKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = 600_000
): Promise<Uint8Array> {
  const baseKey = await subtle().importKey(
    "raw",
    asBufferSource(new TextEncoder().encode(password)),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: asBufferSource(salt), iterations },
    baseKey,
    KEY_SIZE * 8
  );
  return new Uint8Array(bits);
}
