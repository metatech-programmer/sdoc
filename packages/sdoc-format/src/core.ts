/**
 * Núcleo del formato .sdoc:
 *  - `createSdoc()`   → factoría de un SdocFile nuevo, vacío.
 *  - `serializeSdoc()` → bytes del archivo `.sdoc` (ZIP) listos para escribir/descargar.
 *  - `parseSdoc()`    → lee bytes de un `.sdoc` y devuelve un SdocFile.
 *  - `signSdoc()` / `verifySdocSignature()` → firma Ed25519 (canonical JSON).
 *  - `encryptSdoc()` / `decryptSdoc()` → cifrado AES-256-GCM del bundle interno.
 *
 * Toda decisión de estructura sigue SPEC.md §6 y §9.3.
 */

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import * as ed from "./crypto/ed25519.js";
import * as aes from "./crypto/aes-gcm.js";
import {
  ENCRYPTION_ALGORITHM,
  FORMAT_VERSION,
  KEY_DERIVATION,
  SCHEMA_VERSION,
  SDOC_PATHS,
  SIGNATURE_ALGORITHM,
  type SdocAcl,
  type SdocDocument,
  type SdocEncryptionMeta,
  type SdocFile,
  type SdocManifest,
  type SdocSignature,
} from "./types.js";
import { documentId as newDocumentId } from "./utils/ulid.js";
import { canonicalChecksum, canonicalize } from "./utils/canonical.js";
import { base64ToBytes, sha256Hex } from "./utils/hash.js";
import {
  stripChecksumAndSignatureRef,
  validateSdocFile,
} from "./validator.js";

// ============================================================
// Factoría: crear un .sdoc vacío
// ============================================================

export interface CreateSdocInput {
  title: string;
  description?: string;
  owner: { id: string; email?: string; name?: string };
  language?: string;
  tags?: string[];
  id?: string;
  /** Si no se pasa, se crea un document con una página vacía. */
  initialDocument?: SdocDocument;
  /** Si no se pasa, se aplican settings sensatos. */
  settings?: Partial<SdocManifest["settings"]>;
}

export async function createSdoc(input: CreateSdocInput): Promise<SdocFile> {
  const now = new Date().toISOString();
  const id = input.id ?? newDocumentId();

  const document: SdocDocument = input.initialDocument ?? {
    type: "document",
    version: "1.0",
    pages: [
      {
        id: "page_001",
        order: 1,
        size: { width: 794, height: 1123, unit: "px" },
        margins: { top: 72, right: 72, bottom: 72, left: 72 },
        elements: [
          {
            id: "e001",
            type: "paragraph",
            children: [{ type: "text", content: "" }],
          },
        ],
      },
    ],
  };

  const contentChecksum = await canonicalChecksum(document);

  // Construir manifest sin checksum del manifest todavía
  const manifestDraft: SdocManifest = {
    $schema: "https://sdoc.app/schemas/manifest/v1.json",
    formatVersion: FORMAT_VERSION,
    id,
    title: input.title,
    description: input.description,
    createdAt: now,
    updatedAt: now,
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    owner: input.owner,
    settings: {
      syncEnabled: true,
      offlineEnabled: true,
      collaborationEnabled: true,
      versioningEnabled: true,
      maxVersions: 100,
      autoSaveIntervalSeconds: 30,
      ...input.settings,
    },
    security: {
      encryption: ENCRYPTION_ALGORITHM,
      keyDerivation: KEY_DERIVATION,
      contentChecksum,
      manifestChecksum: "sha256:" + "0".repeat(64), // placeholder
      signatureAlgorithm: SIGNATURE_ALGORITHM,
      encryptedContent: false,
    },
    meta: {
      wordCount: 0,
      pageCount: document.pages.length,
      language: input.language ?? "es",
      tags: input.tags ?? [],
      aiGenerated: false,
    },
  };

  // Calcular el checksum del manifest sin el propio campo
  const manifestChecksum = await canonicalChecksum(
    stripChecksumAndSignatureRef(manifestDraft)
  );

  const manifest: SdocManifest = {
    ...manifestDraft,
    security: { ...manifestDraft.security, manifestChecksum },
  };

  return { manifest, document };
}

// ============================================================
// Serializar SdocFile → bytes (.sdoc / ZIP)
// ============================================================

/**
 * Convierte un `SdocFile` en bytes listos para escribir como `.sdoc`.
 *
 * - Si el archivo **NO está firmado**: actualiza `updatedAt` y recalcula
 *   los checksums del manifest/document para garantizar consistencia.
 * - Si el archivo **YA está firmado**: NO toca nada (esto invalidaría la
 *   firma). Si quieres modificar contenido tras firmar, llama
 *   `signSdoc()` de nuevo antes de serializar.
 *
 * Para serializar TAL CUAL sin recalcular nada, usa `serializeSdocRaw()`.
 */
export async function serializeSdoc(file: SdocFile): Promise<Uint8Array> {
  if (file.signature) {
    // Preserva exactamente el contenido firmado.
    return serializeSdocRaw(file);
  }

  // 1. Actualizar updatedAt PRIMERO (afecta el hash del manifest).
  const updatedAt = new Date().toISOString();

  // 2. Recalcular contentChecksum (puede haber cambiado el document).
  const contentChecksum = await canonicalChecksum(file.document);

  // 3. Construir manifest "tentativo" sin manifestChecksum, con el updatedAt nuevo.
  const tentativeManifest: SdocManifest = {
    ...file.manifest,
    updatedAt,
    security: {
      ...file.manifest.security,
      contentChecksum,
      // dejamos manifestChecksum y signatureRef tal como están para que el
      // strip los excluya y el hash sea reproducible al re-leer.
    },
  };

  // 4. Calcular el manifestChecksum sobre el manifest tentativo SIN los campos
  //    que se excluyen (manifestChecksum, signatureRef).
  const manifestForHash = stripChecksumAndSignatureRef(tentativeManifest);
  const manifestChecksum = await canonicalChecksum(manifestForHash);

  // 5. Manifest final con el manifestChecksum correcto.
  const manifest: SdocManifest = {
    ...tentativeManifest,
    security: { ...tentativeManifest.security, manifestChecksum },
  };

  return serializeSdocRaw({ ...file, manifest });
}

/**
 * Serializa el archivo TAL CUAL está, sin recalcular checksums.
 * Útil cuando el archivo ya está firmado y no quieres romper la firma.
 */
export function serializeSdocRaw(file: SdocFile): Uint8Array {
  const entries: Record<string, Uint8Array> = {};

  entries[SDOC_PATHS.MANIFEST] = strToU8(canonicalize(file.manifest));
  entries[SDOC_PATHS.DOCUMENT] = strToU8(canonicalize(file.document));

  if (file.acl) {
    entries[SDOC_PATHS.ACL] = strToU8(canonicalize(file.acl));
  }
  if (file.signature) {
    entries[SDOC_PATHS.SIGNATURE] = strToU8(canonicalize(file.signature));
  }
  if (file.encryptionMeta) {
    entries[SDOC_PATHS.ENCRYPTION_META] = strToU8(canonicalize(file.encryptionMeta));
  }
  if (file.crdtState) {
    entries[SDOC_PATHS.CRDT_STATE] = file.crdtState;
  }
  if (file.pendingOps) {
    entries[SDOC_PATHS.PENDING_OPS] = strToU8(canonicalize(file.pendingOps));
  }
  if (file.preview?.thumbnailWebp) {
    entries[SDOC_PATHS.PREVIEW_THUMB] = file.preview.thumbnailWebp;
  }
  if (file.preview?.pdf) {
    entries[SDOC_PATHS.PREVIEW_PDF] = file.preview.pdf;
  }
  if (file.preview?.html) {
    entries[SDOC_PATHS.PREVIEW_HTML] = strToU8(file.preview.html);
  }
  if (file.revisions) {
    entries[SDOC_PATHS.REVISIONS_INDEX] = strToU8(
      canonicalize(file.revisions.index)
    );
    if (file.revisions.patches) {
      for (const [name, patch] of Object.entries(file.revisions.patches)) {
        entries[`${SDOC_PATHS.REVISIONS_PATCHES_PREFIX}${name}`] = strToU8(
          canonicalize(patch)
        );
      }
    }
  }
  if (file.assets) {
    for (const [name, bytes] of Object.entries(file.assets)) {
      // Si la key ya viene con prefijo "assets/", la respetamos; si no, la agregamos.
      const path = name.startsWith(SDOC_PATHS.ASSETS_PREFIX)
        ? name
        : `${SDOC_PATHS.ASSETS_PREFIX}${name}`;
      entries[path] = bytes;
    }
  }

  return zipSync(entries, { level: 6 });
}

// ============================================================
// Parsear bytes (.sdoc) → SdocFile
// ============================================================

export interface ParseOptions {
  /** Si true, ejecuta `validateSdocFile` y lanza si hay errores. Default: true. */
  validate?: boolean;
  /** Si true, ignora checksums fallidos (no recomendado fuera de tests). */
  skipChecksums?: boolean;
}

export async function parseSdoc(
  data: Uint8Array,
  options: ParseOptions = {}
): Promise<SdocFile> {
  const validate = options.validate !== false;

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data);
  } catch (cause) {
    throw new ParseError("El archivo no es un ZIP válido", "structural", { cause });
  }

  const manifestRaw = entries[SDOC_PATHS.MANIFEST];
  const documentRaw = entries[SDOC_PATHS.DOCUMENT];
  if (!manifestRaw) {
    throw new ParseError(
      "Falta manifest.json. Archivo .sdoc inválido.",
      "missing_required"
    );
  }
  if (!documentRaw) {
    throw new ParseError(
      "Falta content/document.json. Archivo .sdoc inválido.",
      "missing_required"
    );
  }

  const manifest = safeJsonParse<SdocManifest>(manifestRaw, SDOC_PATHS.MANIFEST);
  const document = safeJsonParse<SdocDocument>(documentRaw, SDOC_PATHS.DOCUMENT);

  // Comprobar versión del formato soportada (solo major.minor)
  if (!isSupportedFormatVersion(manifest.formatVersion)) {
    throw new ParseError(
      `Versión de formato no soportada: ${manifest.formatVersion}. Esta lib soporta ${FORMAT_VERSION}.`,
      "format_unsupported"
    );
  }

  const file: SdocFile = { manifest, document };

  if (entries[SDOC_PATHS.ACL]) {
    file.acl = safeJsonParse<SdocAcl>(entries[SDOC_PATHS.ACL], SDOC_PATHS.ACL);
  }
  if (entries[SDOC_PATHS.SIGNATURE]) {
    file.signature = safeJsonParse<SdocSignature>(
      entries[SDOC_PATHS.SIGNATURE],
      SDOC_PATHS.SIGNATURE
    );
  }
  if (entries[SDOC_PATHS.ENCRYPTION_META]) {
    file.encryptionMeta = safeJsonParse<SdocEncryptionMeta>(
      entries[SDOC_PATHS.ENCRYPTION_META],
      SDOC_PATHS.ENCRYPTION_META
    );
  }
  if (entries[SDOC_PATHS.CRDT_STATE]) {
    file.crdtState = entries[SDOC_PATHS.CRDT_STATE];
  }
  if (entries[SDOC_PATHS.PENDING_OPS]) {
    file.pendingOps = safeJsonParse<unknown[]>(
      entries[SDOC_PATHS.PENDING_OPS],
      SDOC_PATHS.PENDING_OPS
    );
  }

  // Preview
  const previewThumb = entries[SDOC_PATHS.PREVIEW_THUMB];
  const previewPdf = entries[SDOC_PATHS.PREVIEW_PDF];
  const previewHtml = entries[SDOC_PATHS.PREVIEW_HTML];
  if (previewThumb || previewPdf || previewHtml) {
    file.preview = {
      thumbnailWebp: previewThumb,
      pdf: previewPdf,
      html: previewHtml ? strFromU8(previewHtml) : undefined,
    };
  }

  // Revisions
  if (entries[SDOC_PATHS.REVISIONS_INDEX]) {
    file.revisions = {
      index: safeJsonParse(
        entries[SDOC_PATHS.REVISIONS_INDEX],
        SDOC_PATHS.REVISIONS_INDEX
      ),
      patches: {},
    };
    for (const path of Object.keys(entries)) {
      if (path.startsWith(SDOC_PATHS.REVISIONS_PATCHES_PREFIX)) {
        const name = path.substring(SDOC_PATHS.REVISIONS_PATCHES_PREFIX.length);
        file.revisions.patches![name] = safeJsonParse(entries[path], path);
      }
    }
  }

  // Assets
  const assets: Record<string, Uint8Array> = {};
  for (const path of Object.keys(entries)) {
    if (path.startsWith(SDOC_PATHS.ASSETS_PREFIX)) {
      const name = path.substring(SDOC_PATHS.ASSETS_PREFIX.length);
      assets[name] = entries[path];
    }
  }
  if (Object.keys(assets).length > 0) file.assets = assets;

  // Validación opcional (default: ON)
  if (validate) {
    const result = await validateSdocFile(file);
    if (!result.valid) {
      const checksumErrors = result.errors.filter((e) => e.code === "checksum_mismatch");
      const schemaErrors = result.errors.filter((e) => e.code !== "checksum_mismatch");

      if (schemaErrors.length > 0) {
        throw new ParseError(
          "Archivo .sdoc inválido contra schema:\n" +
            schemaErrors.map((e) => `  - [${e.file}] ${e.path}: ${e.message}`).join("\n"),
          "structural",
          { errors: result.errors }
        );
      }
      if (checksumErrors.length > 0 && !options.skipChecksums) {
        throw new ParseError(
          "Checksums del manifest/document no coinciden. Archivo posiblemente alterado.",
          "checksum_mismatch",
          { errors: result.errors }
        );
      }
    }
  }

  return file;
}

// ============================================================
// Firma Ed25519 sobre canonical(manifest) || canonical(document)
// ============================================================

export interface SignSdocInput {
  file: SdocFile;
  privateKey: string;
  publicKey: string;
  signedBy: { userId: string };
}

export async function signSdoc(input: SignSdocInput): Promise<SdocFile> {
  const { file, privateKey, publicKey, signedBy } = input;

  // 1. Recalcular checksums para garantizar consistencia
  const contentChecksum = await canonicalChecksum(file.document);
  const updatedSecurity = { ...file.manifest.security, contentChecksum };
  const manifestForHash = stripChecksumAndSignatureRef({
    ...file.manifest,
    security: updatedSecurity,
  });
  const manifestChecksum = await canonicalChecksum(manifestForHash);

  // 2. Construir manifest con signatureRef
  const manifest: SdocManifest = {
    ...file.manifest,
    security: {
      ...updatedSecurity,
      manifestChecksum,
      signatureRef: SDOC_PATHS.SIGNATURE,
    },
  };

  // 3. Hash a firmar = SHA-256 de canonical(manifest) || canonical(document)
  const payload = await buildSignaturePayload(manifest, file.document);
  const signedHashHex = await sha256Hex(payload);

  // 4. Firmar el hash con Ed25519
  const signature = await ed.sign(payload, privateKey, publicKey);
  const fingerprint = await ed.publicKeyFingerprint(publicKey);

  const signatureFile: SdocSignature = {
    algorithm: SIGNATURE_ALGORITHM,
    signedAt: new Date().toISOString(),
    signedBy: {
      userId: signedBy.userId,
      publicKey,
      publicKeyFingerprint: fingerprint,
    },
    signedHash: "sha256:" + signedHashHex,
    signature,
  };

  return { ...file, manifest, signature: signatureFile };
}

export async function verifySdocSignature(file: SdocFile): Promise<{
  valid: boolean;
  reason?: string;
}> {
  if (!file.signature) {
    return { valid: false, reason: "El archivo no tiene signature.json" };
  }

  const payload = await buildSignaturePayload(file.manifest, file.document);
  const expectedHashHex = await sha256Hex(payload);
  const expectedHash = "sha256:" + expectedHashHex;

  if (file.signature.signedHash !== expectedHash) {
    return {
      valid: false,
      reason: `signedHash no coincide: declarado ${file.signature.signedHash}, calculado ${expectedHash}`,
    };
  }

  const ok = await ed.verify(payload, file.signature.signature, file.signature.signedBy.publicKey);
  return ok ? { valid: true } : { valid: false, reason: "Firma Ed25519 inválida" };
}

async function buildSignaturePayload(
  manifest: SdocManifest,
  document: SdocDocument
): Promise<Uint8Array> {
  // El manifest se canoniza SIN el campo signatureRef ni el manifestChecksum
  // (la firma se calcula sobre el contenido lógico, no sobre los autoreferences).
  const manifestForSig = stripChecksumAndSignatureRef(manifest);
  const canonicalManifest = canonicalize(manifestForSig);
  const canonicalDoc = canonicalize(document);
  const sep = "\n---\n";
  return new TextEncoder().encode(canonicalManifest + sep + canonicalDoc);
}

// ============================================================
// Cifrado del bundle (manifest + document) AES-256-GCM
// ============================================================

export interface EncryptSdocInput {
  file: SdocFile;
  masterKey: Uint8Array;
}

/**
 * Cifra `document.json` (y opcionalmente `acl.json`) y reemplaza el manifest
 * con uno que marca `encryptedContent: true`. El ZIP resultante contiene el
 * ciphertext en `security/encrypted-bundle.bin` y los metadatos en
 * `security/encryption-meta.json`. El `manifest.json` permanece en claro
 * porque debe seguir siendo legible para enrutar/descifrar.
 */
export async function encryptSdoc(
  input: EncryptSdocInput
): Promise<{ bytes: Uint8Array; encryptionMeta: SdocEncryptionMeta }> {
  const { file, masterKey } = input;

  // Construir bundle: solo lo sensible (document + acl si existe).
  const bundle = {
    document: file.document,
    acl: file.acl,
  };
  const plaintext = new TextEncoder().encode(canonicalize(bundle));

  const result = await aes.encrypt({
    plaintext,
    masterKey,
    documentId: file.manifest.id,
  });

  const meta: SdocEncryptionMeta = {
    algorithm: ENCRYPTION_ALGORITHM,
    keyDerivation: {
      function: KEY_DERIVATION,
      salt: result.salt,
      info: result.info,
    },
    iv: result.iv,
    encryptedAt: new Date().toISOString(),
    encryptedFiles: [SDOC_PATHS.DOCUMENT, ...(file.acl ? [SDOC_PATHS.ACL] : [])],
    plaintextChecksum: result.plaintextChecksum,
  };

  // Recalcular contentChecksum (sigue siendo el del documento plano, para
  // que el lector pueda verificar integridad tras descifrar).
  const contentChecksum = await canonicalChecksum(file.document);
  const updatedSecurity = {
    ...file.manifest.security,
    contentChecksum,
    encryptedContent: true,
  };
  const manifestForHash = stripChecksumAndSignatureRef({
    ...file.manifest,
    security: updatedSecurity,
  });
  const manifestChecksum = await canonicalChecksum(manifestForHash);

  const manifest: SdocManifest = {
    ...file.manifest,
    security: { ...updatedSecurity, manifestChecksum },
    updatedAt: new Date().toISOString(),
  };

  // El ZIP cifrado: manifest en claro + bundle cifrado + meta de cifrado + (otros assets/preview)
  const entries: Record<string, Uint8Array> = {
    [SDOC_PATHS.MANIFEST]: strToU8(canonicalize(manifest)),
    "security/encrypted-bundle.bin": base64ToBytes(result.ciphertext),
    [SDOC_PATHS.ENCRYPTION_META]: strToU8(canonicalize(meta)),
  };
  // Conservar preview/crdt/assets/revisions sin cifrar
  if (file.preview?.thumbnailWebp) entries[SDOC_PATHS.PREVIEW_THUMB] = file.preview.thumbnailWebp;
  if (file.preview?.pdf) entries[SDOC_PATHS.PREVIEW_PDF] = file.preview.pdf;
  if (file.preview?.html) entries[SDOC_PATHS.PREVIEW_HTML] = strToU8(file.preview.html);
  if (file.crdtState) entries[SDOC_PATHS.CRDT_STATE] = file.crdtState;
  if (file.assets) {
    for (const [k, v] of Object.entries(file.assets)) {
      const path = k.startsWith(SDOC_PATHS.ASSETS_PREFIX) ? k : SDOC_PATHS.ASSETS_PREFIX + k;
      entries[path] = v;
    }
  }

  return { bytes: zipSync(entries, { level: 6 }), encryptionMeta: meta };
}

export interface DecryptSdocInput {
  bytes: Uint8Array;
  masterKey: Uint8Array;
}

export async function decryptSdoc(input: DecryptSdocInput): Promise<SdocFile> {
  const entries = unzipSync(input.bytes);
  const manifestRaw = entries[SDOC_PATHS.MANIFEST];
  const metaRaw = entries[SDOC_PATHS.ENCRYPTION_META];
  const cipherRaw = entries["security/encrypted-bundle.bin"];

  if (!manifestRaw) throw new ParseError("Falta manifest.json", "missing_required");
  if (!metaRaw) throw new ParseError("Falta security/encryption-meta.json", "missing_required");
  if (!cipherRaw) throw new ParseError("Falta security/encrypted-bundle.bin", "missing_required");

  const manifest = safeJsonParse<SdocManifest>(manifestRaw, SDOC_PATHS.MANIFEST);
  const meta = safeJsonParse<SdocEncryptionMeta>(metaRaw, SDOC_PATHS.ENCRYPTION_META);

  // Importar el ciphertext en base64 desde los bytes binarios:
  const ciphertextB64 = uint8ToBase64Lossless(cipherRaw);

  const plaintext = await aes.decrypt({
    ciphertext: ciphertextB64,
    iv: meta.iv,
    salt: meta.keyDerivation.salt,
    info: meta.keyDerivation.info,
    masterKey: input.masterKey,
    documentId: manifest.id,
    expectedPlaintextChecksum: meta.plaintextChecksum,
  });

  const bundle = JSON.parse(new TextDecoder().decode(plaintext)) as {
    document: SdocDocument;
    acl?: SdocAcl;
  };

  const file: SdocFile = {
    manifest,
    document: bundle.document,
    acl: bundle.acl,
    encryptionMeta: meta,
  };

  if (entries[SDOC_PATHS.PREVIEW_THUMB] || entries[SDOC_PATHS.PREVIEW_PDF] || entries[SDOC_PATHS.PREVIEW_HTML]) {
    file.preview = {
      thumbnailWebp: entries[SDOC_PATHS.PREVIEW_THUMB],
      pdf: entries[SDOC_PATHS.PREVIEW_PDF],
      html: entries[SDOC_PATHS.PREVIEW_HTML]
        ? strFromU8(entries[SDOC_PATHS.PREVIEW_HTML])
        : undefined,
    };
  }
  if (entries[SDOC_PATHS.CRDT_STATE]) file.crdtState = entries[SDOC_PATHS.CRDT_STATE];

  const assets: Record<string, Uint8Array> = {};
  for (const path of Object.keys(entries)) {
    if (path.startsWith(SDOC_PATHS.ASSETS_PREFIX)) {
      assets[path.substring(SDOC_PATHS.ASSETS_PREFIX.length)] = entries[path];
    }
  }
  if (Object.keys(assets).length > 0) file.assets = assets;

  return file;
}

// ============================================================
// Errores
// ============================================================

export class ParseError extends Error {
  code: string;
  details?: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "ParseError";
    this.code = code;
    this.details = details;
  }
}

// ============================================================
// Helpers internos
// ============================================================

function isSupportedFormatVersion(v: string): boolean {
  // Soportamos solo major.minor que coincide; cualquier patch del mismo
  // major.minor está permitido (compat hacia adelante en patch).
  const [maj, min] = v.split(".");
  const [supMaj, supMin] = FORMAT_VERSION.split(".");
  return maj === supMaj && min === supMin;
}

function safeJsonParse<T>(bytes: Uint8Array, file: string): T {
  try {
    return JSON.parse(strFromU8(bytes)) as T;
  } catch (cause) {
    throw new ParseError(`JSON inválido en ${file}`, "structural", { cause });
  }
}

function uint8ToBase64Lossless(bytes: Uint8Array): string {
  // Pasamos por base64 estándar; reutilizamos hash.ts internamente.
  // (Importarlo directamente evita re-encadenar TextDecoder.)
  return base64ToB64Str(bytes);
}

function base64ToB64Str(bytes: Uint8Array): string {
  // Convierte bytes binarios → base64 estándar.
  if (typeof globalThis.btoa === "function") {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return globalThis.btoa(bin);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  return B.from(bytes).toString("base64");
}
