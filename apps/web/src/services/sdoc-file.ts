/**
 * Servicio para importar/exportar archivos .sdoc en el navegador.
 *
 * Usa `@sdoc/format` para parsear y serializar; convierte entre el formato
 * estándar `.sdoc` y la estructura interna que usa el editor (TipTap JSON).
 */

import {
  createSdoc,
  parseSdoc,
  serializeSdoc,
  type SdocFile,
  type SdocDocument,
} from "@sdoc/format";

/**
 * Abre el file picker del navegador para elegir un .sdoc, lo lee y parsea.
 * Devuelve el SdocFile validado.
 */
export async function openSdocFromDisk(): Promise<SdocFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sdoc,application/zip,application/octet-stream";
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) {
        resolve(null);
        return;
      }
      try {
        const buf = await f.arrayBuffer();
        const sdoc = await parseSdoc(new Uint8Array(buf));
        resolve(sdoc);
      } catch (e) {
        reject(e);
      }
    });
    input.click();
  });
}

/**
 * Serializa un SdocFile y dispara descarga del archivo en el navegador.
 */
export async function downloadSdoc(file: SdocFile, filename?: string): Promise<void> {
  const bytes = await serializeSdoc(file);
  const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const safeName = (filename ?? file.manifest.title ?? "documento").replace(/[\/\\:*?"<>|]/g, "_");
  const finalName = safeName.endsWith(".sdoc") ? safeName : safeName + ".sdoc";

  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

/**
 * Convierte un documento TipTap (JSON Yjs/ProseMirror) en un SdocDocument
 * compatible con el formato `.sdoc`.
 *
 * Estrategia simple v1: aplanamos el árbol TipTap a una sola página y
 * mapeamos `heading`, `paragraph`, `image`, `codeBlock` directamente.
 * Tipos no soportados se ignoran o degradan a párrafo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tiptapToSdocDocument(tiptap: any): SdocDocument {
  const elements: SdocDocument["pages"][0]["elements"] = [];
  let idCounter = 1;
  const nextId = () => `e${String(idCounter++).padStart(3, "0")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes: any[] = Array.isArray(tiptap?.content) ? tiptap.content : [];

  for (const n of nodes) {
    if (n.type === "heading") {
      elements.push({
        id: nextId(),
        type: "heading",
        attrs: { level: clampLevel(n.attrs?.level) },
        children: textChildren(n.content),
      });
    } else if (n.type === "paragraph") {
      elements.push({
        id: nextId(),
        type: "paragraph",
        children: textChildren(n.content),
      });
    } else if (n.type === "image" && n.attrs?.src) {
      elements.push({
        id: nextId(),
        type: "image",
        src: String(n.attrs.src),
        alt: n.attrs.alt,
        width: n.attrs.width,
        height: n.attrs.height,
      });
    } else if (n.type === "codeBlock" || n.type === "code_block") {
      elements.push({
        id: nextId(),
        type: "codeblock",
        language: n.attrs?.language,
        content: textPlain(n.content),
      });
    } else {
      // Fallback: convertir cualquier otro nodo a párrafo con su texto plano
      const txt = textPlain(n.content ?? [n]);
      if (txt.trim()) {
        elements.push({
          id: nextId(),
          type: "paragraph",
          children: [{ type: "text", content: txt }],
        });
      }
    }
  }

  if (elements.length === 0) {
    elements.push({
      id: nextId(),
      type: "paragraph",
      children: [{ type: "text", content: "" }],
    });
  }

  return {
    type: "document",
    version: "1.0",
    pages: [
      {
        id: "page_001",
        order: 1,
        size: { width: 794, height: 1123, unit: "px" },
        margins: { top: 72, right: 72, bottom: 72, left: 72 },
        elements,
      },
    ],
  };
}

/**
 * Convierte un SdocDocument de vuelta a JSON TipTap (best-effort).
 * Útil cuando se importa un .sdoc al editor.
 */
export function sdocDocumentToTiptap(doc: SdocDocument): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [];
  for (const page of doc.pages) {
    for (const el of page.elements) {
      switch (el.type) {
        case "heading":
          content.push({
            type: "heading",
            attrs: { level: el.attrs.level },
            content: el.children.map(tiptapText),
          });
          break;
        case "paragraph":
          content.push({
            type: "paragraph",
            content: el.children.map(tiptapText),
          });
          break;
        case "image":
          content.push({
            type: "image",
            attrs: { src: el.src, alt: el.alt, width: el.width, height: el.height },
          });
          break;
        case "codeblock":
          content.push({
            type: "codeBlock",
            attrs: { language: el.language },
            content: [{ type: "text", text: el.content }],
          });
          break;
        default:
          // Otros tipos: ignorar por ahora (table, embed, etc.)
          break;
      }
    }
  }
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

/**
 * Conveniencia: crea un SdocFile completo desde la combinación
 * (metadata mínima + JSON TipTap + estado CRDT opcional) que produce el editor.
 *
 * Si se pasa `crdtState` (típicamente `Y.encodeStateAsUpdate(ydoc)`), el
 * archivo .sdoc resultante lo incluye en `sync/crdt-state.bin`. Eso permite
 * que otro cliente abra el .sdoc y continúe la colaboración desde el mismo
 * estado, sin necesidad del servidor de sync.
 */
export async function buildSdocFromEditor(input: {
  title: string;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  language?: string;
  tiptapJson: unknown;
  crdtState?: Uint8Array;
}): Promise<SdocFile> {
  const file = await createSdoc({
    title: input.title,
    owner: { id: input.ownerId, email: input.ownerEmail, name: input.ownerName },
    language: input.language,
    initialDocument: tiptapToSdocDocument(input.tiptapJson),
  });
  if (input.crdtState && input.crdtState.byteLength > 0) {
    file.crdtState = input.crdtState;
  }
  return file;
}

// ============================================================
// Helpers internos
// ============================================================

function clampLevel(n: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const i = Math.max(1, Math.min(6, Number(n) || 1));
  return i as 1 | 2 | 3 | 4 | 5 | 6;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textChildren(content: any[] | undefined): Array<{
  type: "text";
  content: string;
  marks?: ("bold" | "italic" | "underline" | "strike" | "code" | "link" | "highlight")[];
}> {
  if (!Array.isArray(content)) return [{ type: "text", content: "" }];
  const out = [];
  for (const c of content) {
    if (c.type === "text") {
      const marks = (c.marks ?? [])
        .map((m: { type: string }) => m.type)
        .filter((t: string) =>
          ["bold", "italic", "underline", "strike", "code", "link", "highlight"].includes(t)
        );
      out.push({
        type: "text" as const,
        content: String(c.text ?? ""),
        ...(marks.length > 0 ? { marks } : {}),
      });
    }
  }
  return out.length > 0 ? out : [{ type: "text", content: "" }];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textPlain(content: any[] | undefined): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => (c.type === "text" ? c.text ?? "" : textPlain(c.content)))
    .join("");
}

function tiptapText(node: { type: "text"; content: string; marks?: string[] }) {
  return {
    type: "text",
    text: node.content,
    ...(node.marks && node.marks.length > 0
      ? { marks: node.marks.map((m) => ({ type: m })) }
      : {}),
  };
}
