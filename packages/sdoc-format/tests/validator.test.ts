import { describe, expect, it } from "vitest";
import {
  createSdoc,
  validateManifestJson,
  validateDocumentJson,
  validateSdocFile,
} from "../src/index.js";

describe("validator — schemas individuales", () => {
  it("rechaza manifest sin campos obligatorios", () => {
    const r = validateManifestJson({ id: "doc_X" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "missing_required")).toBe(true);
  });

  it("rechaza id con formato inválido", () => {
    const m = {
      $schema: "https://sdoc.app/schemas/manifest/v1.json",
      formatVersion: "1.0.0",
      id: "doc_INVALID", // muy corto
      title: "x",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 1,
      schemaVersion: "1.0.0",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
      settings: {
        syncEnabled: true,
        offlineEnabled: true,
        collaborationEnabled: true,
        versioningEnabled: true,
      },
      security: {
        encryption: "AES-256-GCM",
        keyDerivation: "HKDF-SHA256",
        contentChecksum: "sha256:" + "0".repeat(64),
        manifestChecksum: "sha256:" + "0".repeat(64),
        signatureAlgorithm: "Ed25519",
        encryptedContent: false,
      },
      meta: {},
    };
    const r = validateManifestJson(m);
    expect(r.valid).toBe(false);
  });

  it("acepta un document mínimo válido", () => {
    const r = validateDocumentJson({
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [],
        },
      ],
    });
    expect(r.valid, r.errors.map((e) => e.message).join("\n")).toBe(true);
  });

  it("rechaza un heading sin attrs.level", () => {
    const r = validateDocumentJson({
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [
            {
              id: "e001",
              type: "heading",
              // attrs faltante
              children: [{ type: "text", content: "x" }],
            },
          ],
        },
      ],
    });
    expect(r.valid).toBe(false);
  });
});

describe("validador completo de SdocFile", () => {
  it("un SdocFile recién creado es válido", async () => {
    const sdoc = await createSdoc({
      title: "Test",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    const r = await validateSdocFile(sdoc);
    expect(r.valid, r.errors.map((e) => e.file + ": " + e.message).join("\n")).toBe(true);
  });

  it("detecta checksum manualmente alterado en el manifest", async () => {
    const sdoc = await createSdoc({
      title: "Test",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    // Sabotear el contentChecksum
    sdoc.manifest.security.contentChecksum = "sha256:" + "f".repeat(64);
    const r = await validateSdocFile(sdoc);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "checksum_mismatch")).toBe(true);
  });
});
