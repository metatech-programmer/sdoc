import { describe, expect, it } from "vitest";
import {
  createSdoc,
  documentId,
  ed25519,
  parseSdoc,
  serializeSdoc,
  signSdoc,
  verifySdocSignature,
  aesGcm,
} from "../src/index.js";
import { base64ToBytes, bytesToBase64 } from "../src/utils/hash.js";

describe("Ed25519 — generación, firma y verificación", () => {
  it("genera un keypair válido", async () => {
    const pair = await ed25519.generateKeyPair();
    expect(pair.publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(pair.privateKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(base64ToBytes(pair.publicKey).length).toBe(32);
    expect(base64ToBytes(pair.privateKey).length).toBe(32);
  });

  it("firma y verifica un mensaje arbitrario", async () => {
    const pair = await ed25519.generateKeyPair();
    const msg = new TextEncoder().encode("Hola SDOC");
    const sig = await ed25519.sign(msg, pair.privateKey, pair.publicKey);
    expect(await ed25519.verify(msg, sig, pair.publicKey)).toBe(true);
  });

  it("rechaza firma con mensaje alterado", async () => {
    const pair = await ed25519.generateKeyPair();
    const msg = new TextEncoder().encode("Original");
    const sig = await ed25519.sign(msg, pair.privateKey, pair.publicKey);
    const tampered = new TextEncoder().encode("Manipulado");
    expect(await ed25519.verify(tampered, sig, pair.publicKey)).toBe(false);
  });

  it("rechaza firma con clave pública distinta", async () => {
    const pairA = await ed25519.generateKeyPair();
    const pairB = await ed25519.generateKeyPair();
    const msg = new TextEncoder().encode("Mensaje");
    const sig = await ed25519.sign(msg, pairA.privateKey, pairA.publicKey);
    expect(await ed25519.verify(msg, sig, pairB.publicKey)).toBe(false);
  });

  it("publicKeyFingerprint es determinista", async () => {
    const pair = await ed25519.generateKeyPair();
    const f1 = await ed25519.publicKeyFingerprint(pair.publicKey);
    const f2 = await ed25519.publicKeyFingerprint(pair.publicKey);
    expect(f1).toBe(f2);
    expect(f1).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe("firma de SdocFile (signSdoc / verifySdocSignature)", () => {
  it("firma un .sdoc y verifica que la firma es válida", async () => {
    const pair = await ed25519.generateKeyPair();
    const sdoc = await createSdoc({
      title: "Documento firmado",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });

    const signed = await signSdoc({
      file: sdoc,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      signedBy: { userId: "usr_01HXYZ0000000000000000000A" },
    });

    expect(signed.signature).toBeDefined();
    expect(signed.signature!.algorithm).toBe("Ed25519");
    expect(signed.signature!.signedHash).toMatch(/^sha256:[a-f0-9]{64}$/);

    const res = await verifySdocSignature(signed);
    expect(res.valid).toBe(true);
  });

  it("la firma sobrevive serialización/deserialización", async () => {
    const pair = await ed25519.generateKeyPair();
    const sdoc = await createSdoc({
      title: "Persiste",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    const signed = await signSdoc({
      file: sdoc,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      signedBy: { userId: "usr_01HXYZ0000000000000000000A" },
    });

    const bytes = await serializeSdoc(signed);
    const parsed = await parseSdoc(bytes);
    expect(parsed.signature).toBeDefined();
    const res = await verifySdocSignature(parsed);
    expect(res.valid).toBe(true);
  });

  it("detecta alteración del document después de firmar", async () => {
    const pair = await ed25519.generateKeyPair();
    const sdoc = await createSdoc({
      title: "Original",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });
    const signed = await signSdoc({
      file: sdoc,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      signedBy: { userId: "usr_01HXYZ0000000000000000000A" },
    });

    // Manipulamos el document tras la firma
    const tampered = {
      ...signed,
      document: {
        ...signed.document,
        pages: [
          {
            ...signed.document.pages[0],
            elements: [
              {
                id: "e001",
                type: "paragraph" as const,
                children: [{ type: "text" as const, content: "INYECTADO" }],
              },
            ],
          },
        ],
      },
    };

    const res = await verifySdocSignature(tampered);
    expect(res.valid).toBe(false);
  });
});

describe("AES-256-GCM con HKDF-SHA256", () => {
  it("cifra y descifra texto plano", async () => {
    const masterKey = new Uint8Array(32);
    crypto.getRandomValues(masterKey);
    const plaintext = new TextEncoder().encode("Hola mundo cifrado");
    const docId = documentId();

    const encrypted = await aesGcm.encrypt({ plaintext, masterKey, documentId: docId });
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.info).toBe(`sdoc-v1:document:${docId}:${toHex(base64ToBytes(encrypted.iv))}`);

    const decrypted = await aesGcm.decrypt({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      info: encrypted.info,
      masterKey,
      documentId: docId,
      expectedPlaintextChecksum: encrypted.plaintextChecksum,
    });
    expect(new TextDecoder().decode(decrypted)).toBe("Hola mundo cifrado");
  });

  it("falla descifrando con clave incorrecta", async () => {
    const masterKey = new Uint8Array(32);
    crypto.getRandomValues(masterKey);
    const otherKey = new Uint8Array(32);
    crypto.getRandomValues(otherKey);
    const plaintext = new TextEncoder().encode("secreto");
    const docId = documentId();

    const enc = await aesGcm.encrypt({ plaintext, masterKey, documentId: docId });

    await expect(
      aesGcm.decrypt({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        salt: enc.salt,
        info: enc.info,
        masterKey: otherKey,
        documentId: docId,
      })
    ).rejects.toThrow(/Descifrado falló/);
  });

  it("falla si el documentId no coincide (AAD distinta)", async () => {
    const masterKey = new Uint8Array(32);
    crypto.getRandomValues(masterKey);
    const plaintext = new TextEncoder().encode("data");
    const docId = documentId();

    const enc = await aesGcm.encrypt({ plaintext, masterKey, documentId: docId });

    await expect(
      aesGcm.decrypt({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        salt: enc.salt,
        // info distinta: el patrón ya no coincide
        info: enc.info.replace(docId, documentId()),
        masterKey,
        documentId: documentId(),
      })
    ).rejects.toThrow();
  });

  it("password → masterKey vía PBKDF2 → encrypt → decrypt", async () => {
    const password = "contraseñá súper segura 🔐";
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const masterKey = await aesGcm.deriveMasterKeyFromPassword(password, salt, 10_000);
    expect(masterKey.length).toBe(32);

    const docId = documentId();
    const enc = await aesGcm.encrypt({
      plaintext: new TextEncoder().encode("doc privado"),
      masterKey,
      documentId: docId,
    });
    const dec = await aesGcm.decrypt({
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      salt: enc.salt,
      info: enc.info,
      masterKey,
      documentId: docId,
    });
    expect(new TextDecoder().decode(dec)).toBe("doc privado");
  });
});

describe("encryptSdoc / decryptSdoc (bundle completo)", () => {
  it("cifra un .sdoc y lo descifra recuperando el documento original", async () => {
    const { encryptSdoc, decryptSdoc } = await import("../src/index.js");
    const masterKey = new Uint8Array(32);
    crypto.getRandomValues(masterKey);

    const sdoc = await createSdoc({
      title: "Doc privado",
      owner: { id: "usr_01HXYZ0000000000000000000A" },
    });

    const { bytes } = await encryptSdoc({ file: sdoc, masterKey });
    expect(bytes.byteLength).toBeGreaterThan(0);

    const recovered = await decryptSdoc({ bytes, masterKey });
    expect(recovered.manifest.id).toBe(sdoc.manifest.id);
    expect(recovered.manifest.security.encryptedContent).toBe(true);
    expect(recovered.document.pages.length).toBe(sdoc.document.pages.length);
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
