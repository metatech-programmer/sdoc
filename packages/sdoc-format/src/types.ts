/**
 * Tipos TypeScript del formato .sdoc.
 *
 * Alineados con SPEC.md §6 y los JSON Schemas en `src/schemas/`.
 * Cualquier cambio aquí debe reflejarse también en los schemas (y viceversa).
 */

/** Versión del formato `.sdoc` soportada por esta librería. */
export const FORMAT_VERSION = "1.0.0";

/** Versión del schema interno del `document.json`. */
export const SCHEMA_VERSION = "1.0.0";

/** Algoritmo de cifrado fijo según SPEC.md §9.3. */
export const ENCRYPTION_ALGORITHM = "AES-256-GCM" as const;

/** Función de derivación de clave fija según SPEC.md §9.3. */
export const KEY_DERIVATION = "HKDF-SHA256" as const;

/** Algoritmo de firma fijo según SPEC.md §9.3. */
export const SIGNATURE_ALGORITHM = "Ed25519" as const;

// ============================================================
// manifest.json
// ============================================================

export interface SdocManifest {
  $schema?: string;
  formatVersion: string;
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  schemaVersion: string;
  owner: SdocOwner;
  settings: SdocSettings;
  security: SdocSecurityMeta;
  meta: SdocDocMeta;
}

export interface SdocOwner {
  id: string;
  email?: string;
  name?: string;
}

export interface SdocSettings {
  syncEnabled: boolean;
  offlineEnabled: boolean;
  collaborationEnabled: boolean;
  versioningEnabled: boolean;
  maxVersions?: number;
  autoSaveIntervalSeconds?: number;
}

export interface SdocSecurityMeta {
  encryption: typeof ENCRYPTION_ALGORITHM;
  keyDerivation: typeof KEY_DERIVATION;
  /** SHA-256 (hex) del `content/document.json` canónico. */
  contentChecksum: string;
  /** SHA-256 (hex) del manifest canónico (excluye este campo y firma). */
  manifestChecksum: string;
  signatureAlgorithm: typeof SIGNATURE_ALGORITHM;
  /** Ruta dentro del ZIP al `signature.json`. */
  signatureRef?: string;
  encryptedContent: boolean;
}

export interface SdocDocMeta {
  wordCount?: number;
  pageCount?: number;
  readingTimeSeconds?: number;
  language?: string;
  tags?: string[];
  aiGenerated?: boolean;
  [k: string]: unknown;
}

// ============================================================
// content/document.json
// ============================================================

export interface SdocDocument {
  type: "document";
  version: string;
  pages: SdocPage[];
}

export interface SdocPage {
  id: string;
  order: number;
  size?: { width: number; height: number; unit: "px" | "mm" | "cm" | "in" | "pt" };
  margins?: { top: number; right: number; bottom: number; left: number };
  elements: SdocElement[];
}

export type SdocElement =
  | SdocHeading
  | SdocParagraph
  | SdocImage
  | SdocTable
  | SdocCodeBlock
  | SdocEmbed;

export interface SdocElementBase {
  id: string;
}

export interface SdocHeading extends SdocElementBase {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  children: SdocTextNode[];
}

export interface SdocParagraph extends SdocElementBase {
  type: "paragraph";
  children: SdocTextNode[];
}

export interface SdocImage extends SdocElementBase {
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  alignment?: "left" | "center" | "right";
}

export interface SdocTable extends SdocElementBase {
  type: "table";
  rows: number;
  cols: number;
  cells?: unknown[];
}

export interface SdocCodeBlock extends SdocElementBase {
  type: "codeblock";
  language?: string;
  content: string;
}

export interface SdocEmbed extends SdocElementBase {
  type: "embed";
  embedType: string;
  data?: Record<string, unknown>;
  fallback?: string;
}

export type SdocMark =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "link"
  | "highlight";

export interface SdocTextNode {
  type: "text";
  content: string;
  marks?: SdocMark[];
}

// ============================================================
// permissions/acl.json
// ============================================================

export type SdocPermission = "READ" | "COMMENT" | "EDIT" | "MANAGE" | "OWNER";

export interface SdocAcl {
  owner: string;
  entries: SdocAclEntry[];
}

export interface SdocAclEntry {
  subject: { type: "user" | "group"; id: string };
  permission: SdocPermission;
  expiresAt?: string | null;
}

// ============================================================
// security/signature.json
// ============================================================

export interface SdocSignature {
  algorithm: typeof SIGNATURE_ALGORITHM;
  signedAt: string;
  signedBy: {
    userId: string;
    publicKey: string;
    publicKeyFingerprint?: string;
  };
  signedHash: string;
  signature: string;
}

// ============================================================
// security/encryption-meta.json
// ============================================================

export interface SdocEncryptionMeta {
  algorithm: typeof ENCRYPTION_ALGORITHM;
  keyDerivation: {
    function: typeof KEY_DERIVATION;
    salt: string;
    info: string;
  };
  iv: string;
  aad?: string;
  encryptedAt: string;
  encryptedFiles: string[];
  plaintextChecksum?: string;
}

// ============================================================
// Estructura en memoria de un archivo .sdoc completo
// ============================================================

/**
 * Representación en memoria de un `.sdoc` ya parseado.
 * Es el "objeto" con el que trabaja la aplicación; la serialización a bytes
 * la maneja `serializeSdoc()`.
 */
export interface SdocFile {
  manifest: SdocManifest;
  document: SdocDocument;
  acl?: SdocAcl;
  signature?: SdocSignature;
  encryptionMeta?: SdocEncryptionMeta;
  /** Archivos binarios opcionales (claves: rutas relativas al ZIP). */
  assets?: Record<string, Uint8Array>;
  /** Estado CRDT serializado (Yjs). */
  crdtState?: Uint8Array;
  /** Operaciones pendientes de sync (offline). */
  pendingOps?: unknown[];
  /** Preview opcional (thumbnail, PDF, HTML fallback). */
  preview?: {
    thumbnailWebp?: Uint8Array;
    pdf?: Uint8Array;
    html?: string;
  };
  /** Revisiones (índice y patches diferenciales). */
  revisions?: {
    index: { versions: SdocRevisionEntry[] };
    patches?: Record<string, unknown>;
  };
}

export interface SdocRevisionEntry {
  n: number;
  createdAt: string;
  createdBy: string;
  changeSummary?: string;
  isAuto: boolean;
  patchRef?: string;
  snapshotRef?: string;
}

// ============================================================
// Resultado de validación
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  /** Ruta dentro del .sdoc, ej: "manifest.json", "content/document.json". */
  file: string;
  /** Path JSON al campo problemático (formato ajv). */
  path: string;
  /** Descripción humana del error. */
  message: string;
  /** Código corto para diferenciar tipos. */
  code:
    | "missing_required"
    | "schema_violation"
    | "checksum_mismatch"
    | "signature_invalid"
    | "format_unsupported"
    | "decryption_failed"
    | "structural";
}

// ============================================================
// Constantes de rutas dentro del ZIP
// ============================================================

export const SDOC_PATHS = {
  MANIFEST: "manifest.json",
  DOCUMENT: "content/document.json",
  STYLES: "content/styles.json",
  LAYOUT: "content/layout.json",
  ACL: "permissions/acl.json",
  SIGNATURE: "security/signature.json",
  ENCRYPTION_META: "security/encryption-meta.json",
  CRDT_STATE: "sync/crdt-state.bin",
  PENDING_OPS: "sync/pending-ops.json",
  PREVIEW_THUMB: "preview/thumbnail.webp",
  PREVIEW_PDF: "preview/preview.pdf",
  PREVIEW_HTML: "preview/preview.html",
  REVISIONS_INDEX: "revisions/index.json",
  ASSETS_PREFIX: "assets/",
  REVISIONS_PATCHES_PREFIX: "revisions/patches/",
} as const;
