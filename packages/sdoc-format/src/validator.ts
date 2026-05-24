/**
 * Validador del formato .sdoc usando Ajv 2020-12.
 *
 * Valida cada archivo interno contra su JSON Schema correspondiente.
 * Devuelve un `ValidationResult` con lista de errores agrupados por archivo.
 */

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import manifestSchema from "./schemas/manifest.v1.json" with { type: "json" };
import documentSchema from "./schemas/document.v1.json" with { type: "json" };
import aclSchema from "./schemas/acl.v1.json" with { type: "json" };
import signatureSchema from "./schemas/signature.v1.json" with { type: "json" };
import encryptionMetaSchema from "./schemas/encryption-meta.v1.json" with { type: "json" };
import type {
  SdocAcl,
  SdocDocument,
  SdocEncryptionMeta,
  SdocFile,
  SdocManifest,
  SdocSignature,
  ValidationError,
  ValidationResult,
} from "./types.js";
import { SDOC_PATHS } from "./types.js";
import { canonicalChecksum } from "./utils/canonical.js";

// Instancia única (Ajv es seguro de reusar).
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateManifest = ajv.compile<SdocManifest>(manifestSchema as object);
const validateDocument = ajv.compile<SdocDocument>(documentSchema as object);
const validateAcl = ajv.compile<SdocAcl>(aclSchema as object);
const validateSignature = ajv.compile<SdocSignature>(signatureSchema as object);
const validateEncryptionMeta = ajv.compile<SdocEncryptionMeta>(
  encryptionMetaSchema as object
);

// ============================================================
// Validación de piezas individuales
// ============================================================

export function validateManifestJson(data: unknown): ValidationResult {
  return toResult(SDOC_PATHS.MANIFEST, validateManifest, data);
}

export function validateDocumentJson(data: unknown): ValidationResult {
  return toResult(SDOC_PATHS.DOCUMENT, validateDocument, data);
}

export function validateAclJson(data: unknown): ValidationResult {
  return toResult(SDOC_PATHS.ACL, validateAcl, data);
}

export function validateSignatureJson(data: unknown): ValidationResult {
  return toResult(SDOC_PATHS.SIGNATURE, validateSignature, data);
}

export function validateEncryptionMetaJson(data: unknown): ValidationResult {
  return toResult(SDOC_PATHS.ENCRYPTION_META, validateEncryptionMeta, data);
}

// ============================================================
// Validación completa de un SdocFile (estructura + schemas + checksums)
// ============================================================

/**
 * Valida un `SdocFile` parseado:
 *  1. Schema de manifest, document, y piezas opcionales presentes.
 *  2. `security.contentChecksum` coincide con el SHA-256 canónico del document.
 *  3. `security.manifestChecksum` coincide con el SHA-256 canónico del manifest
 *     excluyendo el propio campo `manifestChecksum` y la firma.
 *  4. Si hay firma, valida la estructura de `signature.json` (la verificación
 *     criptográfica se hace aparte con `verifySignature`, que necesita la pubkey).
 */
export async function validateSdocFile(file: SdocFile): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // 1. Manifest
  const manifestRes = validateManifestJson(file.manifest);
  errors.push(...manifestRes.errors);

  // 2. Document
  const docRes = validateDocumentJson(file.document);
  errors.push(...docRes.errors);

  // 3. ACL opcional
  if (file.acl) {
    errors.push(...validateAclJson(file.acl).errors);
  }

  // 4. Firma opcional (solo estructura)
  if (file.signature) {
    errors.push(...validateSignatureJson(file.signature).errors);
  }

  // 5. Encryption meta opcional
  if (file.encryptionMeta) {
    errors.push(...validateEncryptionMetaJson(file.encryptionMeta).errors);
  }

  // Si la estructura ya falla, no tiene sentido validar checksums.
  if (manifestRes.valid && docRes.valid) {
    // 6. Checksum del document
    const docChecksum = await canonicalChecksum(file.document);
    if (docChecksum !== file.manifest.security.contentChecksum) {
      errors.push({
        file: SDOC_PATHS.DOCUMENT,
        path: "security.contentChecksum",
        message: `Checksum mismatch: manifest declara ${file.manifest.security.contentChecksum} pero el document canónico produce ${docChecksum}`,
        code: "checksum_mismatch",
      });
    }

    // 7. Checksum del manifest (excluye manifestChecksum y signatureRef)
    const manifestForHash = stripChecksumAndSignatureRef(file.manifest);
    const expectedManifestChecksum = await canonicalChecksum(manifestForHash);
    if (expectedManifestChecksum !== file.manifest.security.manifestChecksum) {
      errors.push({
        file: SDOC_PATHS.MANIFEST,
        path: "security.manifestChecksum",
        message: `Checksum mismatch: manifest declara ${file.manifest.security.manifestChecksum} pero el cálculo canónico produce ${expectedManifestChecksum}`,
        code: "checksum_mismatch",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Construye una copia del manifest sin los campos que NO entran en su propio
 * checksum (manifestChecksum y signatureRef). Útil tanto para validar como
 * para regenerar el checksum.
 */
export function stripChecksumAndSignatureRef(m: SdocManifest): Omit<
  SdocManifest,
  "security"
> & {
  security: Omit<SdocManifest["security"], "manifestChecksum" | "signatureRef">;
} {
  const { manifestChecksum: _mc, signatureRef: _sr, ...restSec } = m.security;
  return {
    ...m,
    security: restSec,
  };
}

// ============================================================
// Helpers internos
// ============================================================

interface AjvValidator {
  (data: unknown): boolean;
  errors?: Array<{ instancePath?: string; schemaPath?: string; message?: string; keyword?: string }> | null;
}

function toResult(
  file: string,
  fn: AjvValidator,
  data: unknown
): ValidationResult {
  const ok = fn(data);
  if (ok) return { valid: true, errors: [] };
  const errors: ValidationError[] = (fn.errors ?? []).map((e) => ({
    file,
    path: e.instancePath || "/",
    message: e.message ?? "Validation error",
    code:
      e.keyword === "required"
        ? "missing_required"
        : "schema_violation",
  }));
  return { valid: errors.length === 0, errors };
}
