/**
 * @sdoc/format — Librería oficial del formato .sdoc.
 *
 * Implementa SPEC.md §6 (formato) y §9.3 (cifrado + firma).
 *
 * API principal:
 *  - `createSdoc(input)`       → crea un SdocFile vacío.
 *  - `serializeSdoc(file)`     → bytes listos para escribir/descargar.
 *  - `parseSdoc(bytes)`        → lee un .sdoc y devuelve SdocFile validado.
 *  - `signSdoc(...)`           → firma Ed25519.
 *  - `verifySdocSignature(...)` → verifica firma.
 *  - `encryptSdoc(...)` / `decryptSdoc(...)` → cifrado AES-256-GCM + HKDF.
 *  - `validateSdocFile(file)`  → valida contra JSON Schemas + checksums.
 *
 * Toda crypto usa Web Crypto API nativa (Node 20+ o navegador moderno).
 */

export * from "./types.js";
export * from "./core.js";
export * from "./validator.js";

// Crypto submódulos expuestos para uso avanzado
export * as ed25519 from "./crypto/ed25519.js";
export * as aesGcm from "./crypto/aes-gcm.js";

// Utilidades
export { ulid, documentId, userId, isUlid } from "./utils/ulid.js";
export { canonicalize, canonicalChecksum } from "./utils/canonical.js";
export {
  sha256,
  sha256Hex,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  timingSafeEqual,
} from "./utils/hash.js";

// Schemas (re-export para consumidores que quieran usarlos directamente)
import manifestSchema from "./schemas/manifest.v1.json" with { type: "json" };
import documentSchema from "./schemas/document.v1.json" with { type: "json" };
import aclSchema from "./schemas/acl.v1.json" with { type: "json" };
import signatureSchema from "./schemas/signature.v1.json" with { type: "json" };
import encryptionMetaSchema from "./schemas/encryption-meta.v1.json" with { type: "json" };

export const schemas = {
  manifest: manifestSchema,
  document: documentSchema,
  acl: aclSchema,
  signature: signatureSchema,
  encryptionMeta: encryptionMetaSchema,
} as const;
