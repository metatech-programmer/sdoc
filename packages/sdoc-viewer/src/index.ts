/**
 * @sdoc/viewer — Viewer read-only del formato .sdoc.
 *
 * Componente vanilla (sin React/Vue) que toma un Uint8Array de un `.sdoc`,
 * lo parsea con `@sdoc/format`, verifica firma e integridad, y monta el
 * documento en un elemento HTML.
 *
 * Uso:
 *
 *   import { mountSdocViewer } from "@sdoc/viewer";
 *   import "@sdoc/viewer/style.css";
 *
 *   const bytes = await fetch("doc.sdoc").then(r => r.arrayBuffer());
 *   const handle = await mountSdocViewer(document.getElementById("v")!, {
 *     source: new Uint8Array(bytes),
 *     theme: "auto",
 *     verifySignature: true,
 *   });
 *
 *   handle.destroy(); // limpiar
 */

import {
  parseSdoc,
  verifySdocSignature,
  type SdocFile,
} from "@sdoc/format";

import { renderDocumentToHtml, type RenderOptions } from "./renderer.js";

export { renderDocumentToHtml } from "./renderer.js";
export type { RenderOptions } from "./renderer.js";

export interface MountOptions {
  /** Bytes del `.sdoc`, o un SdocFile ya parseado. */
  source: Uint8Array | SdocFile;
  /** "light" | "dark" | "auto" (sigue prefers-color-scheme). Default: auto. */
  theme?: "light" | "dark" | "auto";
  /** Si true, verifica la firma Ed25519 al montar. Default: true. */
  verifySignature?: boolean;
  /** Si true, muestra encabezado con título + badges. Default: true. */
  showHeader?: boolean;
  /** Resolver de assets (ver renderer). */
  assetUrl?: RenderOptions["assetUrl"];
  /** Locale para el atributo `lang`. */
  lang?: string;
  /** Si true, prepende "página N / total" antes de cada página. */
  showPageNumbers?: boolean;
}

export interface ViewerHandle {
  /** Archivo parseado, disponible tras el mount. */
  file: SdocFile;
  /** Resultado de la verificación de firma (si se ejecutó). */
  signatureValid: boolean | null;
  /** Desmonta el viewer y libera el contenedor. */
  destroy(): void;
}

/**
 * Monta el viewer en un contenedor DOM.
 * Lanza si el `.sdoc` está corrupto o falla validación.
 */
export async function mountSdocViewer(
  container: HTMLElement,
  opts: MountOptions
): Promise<ViewerHandle> {
  container.innerHTML = `<div class="sdoc-viewer-loading">Cargando documento .sdoc…</div>`;

  let file: SdocFile;
  try {
    file = opts.source instanceof Uint8Array
      ? await parseSdoc(opts.source)
      : opts.source;
  } catch (e) {
    container.innerHTML = `<div class="sdoc-viewer-error"><strong>No se pudo leer el .sdoc</strong>${escErr(e)}</div>`;
    throw e;
  }

  let signatureValid: boolean | null = null;
  if (opts.verifySignature !== false && file.signature) {
    const res = await verifySdocSignature(file);
    signatureValid = res.valid;
  }

  render(container, file, opts, signatureValid);

  return {
    file,
    signatureValid,
    destroy() {
      container.innerHTML = "";
    },
  };
}

/**
 * Atajo: monta el viewer apuntando a una URL del `.sdoc`. Hace `fetch`
 * y luego llama `mountSdocViewer`.
 */
export async function mountSdocViewerFromUrl(
  container: HTMLElement,
  url: string,
  opts: Omit<MountOptions, "source"> = {}
): Promise<ViewerHandle> {
  const res = await fetch(url);
  if (!res.ok) {
    container.innerHTML = `<div class="sdoc-viewer-error"><strong>No se pudo descargar el archivo</strong>HTTP ${res.status}</div>`;
    throw new Error(`HTTP ${res.status} al pedir ${url}`);
  }
  const buf = await res.arrayBuffer();
  return mountSdocViewer(container, { ...opts, source: new Uint8Array(buf) });
}

// ============================================================
// Render
// ============================================================

function render(
  container: HTMLElement,
  file: SdocFile,
  opts: MountOptions,
  signatureValid: boolean | null
): void {
  const theme = opts.theme ?? "auto";
  container.className = "sdoc-viewer";
  if (theme !== "auto") container.setAttribute("data-theme", theme);
  else container.removeAttribute("data-theme");
  const langValue = opts.lang ?? file.manifest.meta?.language;
  if (langValue) container.setAttribute("lang", String(langValue));

  const header = opts.showHeader === false ? "" : renderHeader(file, signatureValid);
  const body = renderDocumentToHtml(file.document, {
    assetUrl: opts.assetUrl,
    showPageNumbers: opts.showPageNumbers,
  });

  container.innerHTML = `${header}<div class="sdoc-viewer__body">${body}</div>`;
}

function renderHeader(file: SdocFile, signatureValid: boolean | null): string {
  const m = file.manifest;
  const title = escHtml(m.title);
  const author = m.owner?.name ? escHtml(m.owner.name) : escHtml(m.owner.id);
  const updated = new Date(m.updatedAt).toLocaleString();
  const words = m.meta?.wordCount ? `${m.meta.wordCount} palabras · ` : "";

  let badges = `<span class="sdoc-viewer__badge">v${m.version}</span>`;
  if (m.security.encryptedContent) {
    badges += `<span class="sdoc-viewer__badge sdoc-viewer__badge--enc">cifrado</span>`;
  }
  if (file.signature) {
    if (signatureValid === true) {
      badges += `<span class="sdoc-viewer__badge sdoc-viewer__badge--ok">firmado · firma válida</span>`;
    } else if (signatureValid === false) {
      badges += `<span class="sdoc-viewer__badge sdoc-viewer__badge--bad">firma inválida</span>`;
    } else {
      badges += `<span class="sdoc-viewer__badge">firmado</span>`;
    }
  }

  return `<header class="sdoc-viewer__header">
    <h1 class="sdoc-viewer__title">${title}</h1>
    <div class="sdoc-viewer__meta">${words}${author} · actualizado ${escHtml(updated)}</div>
    <div class="sdoc-viewer__badges">${badges}</div>
  </header>`;
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return `<pre style="font-size: 0.8em; opacity: 0.7; margin-top: 0.5em">${escHtml(msg)}</pre>`;
}
