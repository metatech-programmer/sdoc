// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mountSdocViewer } from "../src/index.js";
import { createSdoc, serializeSdoc, signSdoc, ed25519, userId as newUserId } from "@sdoc/format";

const DEMO_USER = newUserId();

describe("mountSdocViewer (jsdom)", () => {
  it("monta un .sdoc no firmado en el container y muestra header", async () => {
    const sdoc = await createSdoc({
      title: "Doc montado",
      owner: { id: DEMO_USER, name: "Demo" },
    });
    const bytes = await serializeSdoc(sdoc);

    const container = document.createElement("div");
    document.body.appendChild(container);

    const handle = await mountSdocViewer(container, { source: bytes });
    expect(handle.file.manifest.title).toBe("Doc montado");
    expect(handle.signatureValid).toBe(null); // no había firma
    expect(container.classList.contains("sdoc-viewer")).toBe(true);
    expect(container.innerHTML).toContain("Doc montado");

    handle.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("verifica firma Ed25519 y muestra badge 'firma válida'", async () => {
    const pair = await ed25519.generateKeyPair();
    const base = await createSdoc({
      title: "Doc firmado",
      owner: { id: DEMO_USER },
    });
    const signed = await signSdoc({
      file: base,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      signedBy: { userId: DEMO_USER },
    });
    const bytes = await serializeSdoc(signed);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const handle = await mountSdocViewer(container, { source: bytes });

    expect(handle.signatureValid).toBe(true);
    expect(container.innerHTML).toContain("firma válida");
  });

  it("aplica data-theme cuando se pasa", async () => {
    const sdoc = await createSdoc({
      title: "Tema",
      owner: { id: DEMO_USER },
    });
    const bytes = await serializeSdoc(sdoc);
    const container = document.createElement("div");
    document.body.appendChild(container);

    await mountSdocViewer(container, { source: bytes, theme: "dark" });
    expect(container.getAttribute("data-theme")).toBe("dark");
  });
});
