/**
 * Renderer puro: SdocDocument → HTML string.
 *
 * Sin dependencia DOM (funciona en SSR/Node). El `mountSdocViewer` lo usa
 * para construir el body. Puedes también llamarlo directo si quieres SSR
 * o convertir un .sdoc a HTML estático.
 */

import type {
  SdocCodeBlock,
  SdocDocument,
  SdocElement,
  SdocEmbed,
  SdocHeading,
  SdocImage,
  SdocMark,
  SdocParagraph,
  SdocTable,
  SdocTextNode,
} from "@sdoc/format";

export interface RenderOptions {
  /**
   * Función opcional para resolver la URL final de un asset embebido.
   * Recibe la ruta declarada en el documento (ej. "assets/images/foto.webp")
   * y debe devolver la URL pública correspondiente. Si no se pasa, los
   * `src` se renderizan tal cual (útil para SSR con paths relativos).
   */
  assetUrl?: (relativePath: string) => string;
  /** Si true, anota "página N / total" antes de cada página. */
  showPageNumbers?: boolean;
}

/**
 * Convierte un SdocDocument completo en HTML.
 * Devuelve un string seguro (escapa todo contenido textual del usuario).
 */
export function renderDocumentToHtml(
  doc: SdocDocument,
  opts: RenderOptions = {}
): string {
  const total = doc.pages.length;
  return doc.pages
    .map((page, idx) => {
      const number =
        opts.showPageNumbers
          ? `<div class="sdoc-viewer__page-number">página ${idx + 1} / ${total}</div>`
          : "";
      const body = page.elements.map((el) => renderElement(el, opts)).join("");
      return `<section class="sdoc-viewer__page" id="${escAttr(page.id)}">${number}${body}</section>`;
    })
    .join("");
}

function renderElement(el: SdocElement, opts: RenderOptions): string {
  switch (el.type) {
    case "heading":
      return renderHeading(el);
    case "paragraph":
      return renderParagraph(el);
    case "image":
      return renderImage(el, opts);
    case "table":
      return renderTable(el);
    case "codeblock":
      return renderCodeBlock(el);
    case "embed":
      return renderEmbed(el);
    default: {
      // Cobertura exhaustiva: TypeScript debería haber agotado los tipos.
      const _exhaustive: never = el;
      return `<!-- unknown element ${(_exhaustive as { type?: string })?.type ?? ""} -->`;
    }
  }
}

function renderHeading(el: SdocHeading): string {
  const tag = `h${el.attrs.level}`;
  return `<${tag} id="${escAttr(el.id)}">${renderTextChildren(el.children)}</${tag}>`;
}

function renderParagraph(el: SdocParagraph): string {
  return `<p id="${escAttr(el.id)}">${renderTextChildren(el.children)}</p>`;
}

function renderImage(el: SdocImage, opts: RenderOptions): string {
  const src = opts.assetUrl ? opts.assetUrl(el.src) : el.src;
  const align = el.alignment ?? "center";
  const w = el.width ? ` width="${el.width}"` : "";
  const h = el.height ? ` height="${el.height}"` : "";
  return `<figure class="sdoc-viewer__image sdoc-viewer__image--${escAttr(align)}" id="${escAttr(el.id)}">
    <img src="${escAttr(src)}" alt="${escAttr(el.alt ?? "")}"${w}${h} loading="lazy" />
    ${el.alt ? `<figcaption>${escHtml(el.alt)}</figcaption>` : ""}
  </figure>`;
}

function renderTable(el: SdocTable): string {
  // v1: render simple basado en rows/cols. `cells` se proyecta linealmente.
  const cells = Array.isArray(el.cells) ? el.cells : [];
  let html = `<table class="sdoc-viewer__table" id="${escAttr(el.id)}">`;
  for (let r = 0; r < el.rows; r++) {
    html += "<tr>";
    for (let c = 0; c < el.cols; c++) {
      const v = cells[r * el.cols + c];
      const tag = r === 0 ? "th" : "td";
      html += `<${tag}>${escHtml(v == null ? "" : String(v))}</${tag}>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  return html;
}

function renderCodeBlock(el: SdocCodeBlock): string {
  const lang = el.language ? ` data-language="${escAttr(el.language)}"` : "";
  return `<pre class="sdoc-viewer__code" id="${escAttr(el.id)}"${lang}><code>${escHtml(el.content)}</code></pre>`;
}

function renderEmbed(el: SdocEmbed): string {
  // No ejecutamos contenido embebido por seguridad. Mostramos fallback.
  const type = escHtml(el.embedType ?? "embed");
  return `<div class="sdoc-viewer__embed" id="${escAttr(el.id)}">
    <strong>${type}</strong>
    ${el.fallback ? `<div>${escHtml(el.fallback)}</div>` : ""}
  </div>`;
}

function renderTextChildren(nodes: SdocTextNode[]): string {
  if (!Array.isArray(nodes) || nodes.length === 0) return "";
  return nodes.map(renderTextNode).join("");
}

function renderTextNode(n: SdocTextNode): string {
  const safe = escHtml(n.content ?? "");
  if (!n.marks || n.marks.length === 0) return safe;
  return n.marks.reduce<string>((acc, mark) => wrapMark(acc, mark), safe);
}

function wrapMark(html: string, mark: SdocMark): string {
  switch (mark) {
    case "bold":
      return `<strong>${html}</strong>`;
    case "italic":
      return `<em>${html}</em>`;
    case "underline":
      return `<u>${html}</u>`;
    case "strike":
      return `<s>${html}</s>`;
    case "code":
      return `<code>${html}</code>`;
    case "highlight":
      return `<mark>${html}</mark>`;
    case "link":
      // Sin atributo href detectado en marks v1; nos limitamos a marcar el span.
      return `<span class="sdoc-viewer__link">${html}</span>`;
    default:
      return html;
  }
}

// ============================================================
// Escapes de seguridad
// ============================================================

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(s: string): string {
  return escHtml(s).replace(/`/g, "&#96;");
}
