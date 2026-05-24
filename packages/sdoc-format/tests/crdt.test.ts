import { describe, expect, it } from "vitest";
import {
  createSdoc,
  parseSdoc,
  serializeSdoc,
  signSdoc,
  verifySdocSignature,
  ed25519,
  userId as newUserId,
  type SdocFile,
} from "../src/index.js";

const DEMO_USER = newUserId();

/**
 * Tests del CRDT round-trip: el campo `crdtState` (estado Yjs binario)
 * debe sobrevivir create → serialize → parse → tener los mismos bytes.
 *
 * También verificamos que `pendingOps` se preserva.
 */
describe("CRDT round-trip (crdtState + pendingOps)", () => {
  it("preserva crdtState binario byte-a-byte", async () => {
    const base = await createSdoc({
      title: "Doc con CRDT",
      owner: { id: DEMO_USER }, // placeholder, lo regenero
    });
    // Generamos un crdtState ficticio (en la práctica vendría de `Y.encodeStateAsUpdate(ydoc)`)
    const crdt = new Uint8Array(256);
    crypto.getRandomValues(crdt);

    const file: SdocFile = { ...base, crdtState: crdt };

    const bytes = await serializeSdoc(file);
    const parsed = await parseSdoc(bytes);

    expect(parsed.crdtState).toBeDefined();
    expect(parsed.crdtState!.length).toBe(256);
    expect(Array.from(parsed.crdtState!)).toEqual(Array.from(crdt));
  });

  it("preserva pendingOps como JSON canónico", async () => {
    const base = await createSdoc({
      title: "Doc con pending",
      owner: { id: DEMO_USER },
    });
    const pending: unknown[] = [
      { type: "yjs-update", clientId: 42, payload: "base64bytes" },
      { type: "awareness", userId: "usr_X", cursor: { from: 10, to: 12 } },
    ];

    const file: SdocFile = { ...base, pendingOps: pending };
    const bytes = await serializeSdoc(file);
    const parsed = await parseSdoc(bytes);

    expect(parsed.pendingOps).toEqual(pending);
  });

  it("crdtState NO afecta el contentChecksum del manifest", async () => {
    const base = await createSdoc({
      title: "Doc",
      owner: { id: DEMO_USER },
    });
    const original = await serializeSdoc(base);
    const originalParsed = await parseSdoc(original);
    const checksumWithoutCrdt = originalParsed.manifest.security.contentChecksum;

    const withCrdt: SdocFile = { ...base, crdtState: new Uint8Array([1, 2, 3, 4, 5]) };
    const withCrdtBytes = await serializeSdoc(withCrdt);
    const withCrdtParsed = await parseSdoc(withCrdtBytes);

    expect(withCrdtParsed.manifest.security.contentChecksum).toBe(checksumWithoutCrdt);
  });

  it("crdtState convive con firma Ed25519 sin invalidarla", async () => {
    const pair = await ed25519.generateKeyPair();
    const base = await createSdoc({
      title: "Doc firmado con CRDT",
      owner: { id: DEMO_USER },
    });
    const crdt = new Uint8Array(64);
    crypto.getRandomValues(crdt);

    // 1. Agregamos crdtState
    const withCrdt: SdocFile = { ...base, crdtState: crdt };

    // 2. Firmamos
    const signed = await signSdoc({
      file: withCrdt,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      signedBy: { userId: DEMO_USER },
    });

    // 3. Round-trip
    const bytes = await serializeSdoc(signed);
    const parsed = await parseSdoc(bytes);

    expect(parsed.crdtState).toBeDefined();
    expect(parsed.crdtState!.length).toBe(64);
    expect(Array.from(parsed.crdtState!)).toEqual(Array.from(crdt));

    const sig = await verifySdocSignature(parsed);
    expect(sig.valid, sig.reason).toBe(true);
  });
});
