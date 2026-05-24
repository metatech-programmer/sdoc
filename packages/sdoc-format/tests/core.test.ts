import { describe, expect, it } from "vitest";
import {
  createSdoc,
  documentId,
  parseSdoc,
  serializeSdoc,
  validateSdocFile,
  type SdocFile,
} from "../src/index.js";

describe("core: create / serialize / parse (round-trip)", () => {
  it("crea un .sdoc vacío válido", async () => {
    const sdoc = await createSdoc({
      title: "Mi documento",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });

    expect(sdoc.manifest.id).toMatch(/^doc_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(sdoc.manifest.title).toBe("Mi documento");
    expect(sdoc.manifest.version).toBe(1);
    expect(sdoc.document.pages).toHaveLength(1);
    expect(sdoc.manifest.security.encryptedContent).toBe(false);

    const v = await validateSdocFile(sdoc);
    expect(v.valid, v.errors.map((e) => e.message).join("\n")).toBe(true);
  });

  it("round-trip: bytes → parse → validar → idéntico estructuralmente", async () => {
    const original = await createSdoc({
      title: "Round trip test",
      description: "Verifica serialización/deserialización",
      owner: { id: "usr_01HXYZ0000000000000000000A", email: "a@b.com", name: "Alice" },
      language: "es-CO",
      tags: ["test", "round-trip"],
    });

    const bytes = await serializeSdoc(original);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // ZIP magic number "PK\x03\x04"
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const parsed = await parseSdoc(bytes);
    expect(parsed.manifest.id).toBe(original.manifest.id);
    expect(parsed.manifest.title).toBe(original.manifest.title);
    expect(parsed.manifest.description).toBe(original.manifest.description);
    expect(parsed.document.pages.length).toBe(original.document.pages.length);
    expect(parsed.manifest.security.contentChecksum).toBe(
      original.manifest.security.contentChecksum
    );
  });

  it("conserva assets binarios en el round-trip", async () => {
    const sdoc = await createSdoc({
      title: "With assets",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    const imgBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    sdoc.assets = { "images/test.bin": imgBytes };

    const bytes = await serializeSdoc(sdoc);
    const parsed = await parseSdoc(bytes);

    expect(parsed.assets).toBeDefined();
    expect(parsed.assets!["images/test.bin"]).toEqual(imgBytes);
  });

  it("rechaza un ZIP que no tiene manifest.json", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const bytes = zipSync({ "random.txt": strToU8("nada") });
    await expect(parseSdoc(bytes)).rejects.toThrow(/manifest\.json/);
  });

  it("rechaza un archivo que no es ZIP", async () => {
    const bytes = new TextEncoder().encode("esto no es un zip");
    await expect(parseSdoc(bytes)).rejects.toThrow(/ZIP válido/);
  });

  it("detecta tampering del document.json (checksum mismatch)", async () => {
    const sdoc = await createSdoc({
      title: "Original",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    const bytes = await serializeSdoc(sdoc);

    // Manipular el ZIP: cambiar el document sin actualizar el manifest
    const { unzipSync, zipSync, strToU8, strFromU8 } = await import("fflate");
    const entries = unzipSync(bytes);
    const doc = JSON.parse(strFromU8(entries["content/document.json"]));
    doc.pages[0].elements[0].children[0].content = "TEXTO INYECTADO";
    entries["content/document.json"] = strToU8(JSON.stringify(doc));
    const tampered = zipSync(entries);

    await expect(parseSdoc(tampered)).rejects.toThrow(/checksum/i);

    // Pero sí podemos parsearlo con skipChecksums
    const parsed = await parseSdoc(tampered, { skipChecksums: true });
    expect(parsed.document.pages[0].elements[0]).toBeDefined();
  });
});

describe("documentId / ULID", () => {
  it("genera IDs únicos con prefijo doc_", () => {
    const ids = new Set(Array.from({ length: 100 }, () => documentId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^doc_[0-9A-HJKMNP-TV-Z]{26}$/);
    }
  });

  it("IDs no van hacia atrás (timestamp no decrece)", async () => {
    const a = documentId();
    await new Promise((r) => setTimeout(r, 2));
    const b = documentId();
    // ULID se ordena por timestamp; con 2ms de espera nunca debe ir atrás.
    expect(b.localeCompare(a)).toBeGreaterThanOrEqual(0);
  });
});

describe("estructura SdocFile", () => {
  it("admite acl, preview, crdtState, pendingOps opcionales", async () => {
    const sdoc = await createSdoc({
      title: "Rich",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });

    const file: SdocFile = {
      ...sdoc,
      acl: {
        owner: "usr_01HXYZ0000000000000000000A",
        entries: [
          {
            subject: { type: "user", id: "usr_01HXYZ0000000000000000000B" },
            permission: "EDIT",
          },
        ],
      },
      preview: { html: "<p>preview</p>" },
      crdtState: new Uint8Array([0xff, 0xee]),
      pendingOps: [],
    };

    const bytes = await serializeSdoc(file);
    const parsed = await parseSdoc(bytes);

    expect(parsed.acl?.entries).toHaveLength(1);
    expect(parsed.preview?.html).toBe("<p>preview</p>");
    expect(parsed.crdtState).toEqual(new Uint8Array([0xff, 0xee]));
  });
});
