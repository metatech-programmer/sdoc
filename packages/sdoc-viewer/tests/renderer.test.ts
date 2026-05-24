import { describe, expect, it } from "vitest";
import { renderDocumentToHtml } from "../src/renderer.js";
import type { SdocDocument } from "@sdoc/format";

describe("renderDocumentToHtml", () => {
  it("renderiza heading + paragraph + marks", () => {
    const doc: SdocDocument = {
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
              attrs: { level: 1 },
              children: [{ type: "text", content: "Título" }],
            },
            {
              id: "e002",
              type: "paragraph",
              children: [
                { type: "text", content: "Hola " },
                { type: "text", content: "mundo", marks: ["bold"] },
                { type: "text", content: " en " },
                { type: "text", content: "itálica", marks: ["italic"] },
              ],
            },
          ],
        },
      ],
    };

    const html = renderDocumentToHtml(doc);
    expect(html).toContain('<h1 id="e001">Título</h1>');
    expect(html).toContain("<strong>mundo</strong>");
    expect(html).toContain("<em>itálica</em>");
    expect(html).toContain('id="page_001"');
  });

  it("renderiza codeblock con escape de HTML", () => {
    const doc: SdocDocument = {
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [
            {
              id: "e001",
              type: "codeblock",
              language: "html",
              content: "<script>alert('xss')</script>",
            },
          ],
        },
      ],
    };
    const html = renderDocumentToHtml(doc);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("escapa contenido textual del usuario (XSS safe)", () => {
    const doc: SdocDocument = {
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [
            {
              id: "e001",
              type: "paragraph",
              children: [{ type: "text", content: '<img src=x onerror="alert(1)">' }],
            },
          ],
        },
      ],
    };
    const html = renderDocumentToHtml(doc);
    expect(html).not.toMatch(/<img\s+src=x/);
    expect(html).toContain("&lt;img");
  });

  it("usa assetUrl si se pasa", () => {
    const doc: SdocDocument = {
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [
            {
              id: "e001",
              type: "image",
              src: "assets/images/foto.webp",
              alt: "foto",
            },
          ],
        },
      ],
    };
    const html = renderDocumentToHtml(doc, {
      assetUrl: (p) => `https://cdn.example.com/${p}`,
    });
    expect(html).toContain('src="https://cdn.example.com/assets/images/foto.webp"');
    expect(html).toContain('alt="foto"');
  });

  it("renderiza embed con fallback en lugar de ejecutarlo", () => {
    const doc: SdocDocument = {
      type: "document",
      version: "1.0",
      pages: [
        {
          id: "page_001",
          order: 1,
          elements: [
            {
              id: "e001",
              type: "embed",
              embedType: "chart",
              data: { malicious: "<script>" },
              fallback: "Gráfico no disponible en este viewer",
            },
          ],
        },
      ],
    };
    const html = renderDocumentToHtml(doc);
    expect(html).toContain("Gráfico no disponible");
    expect(html).not.toContain("<script>");
  });

  it("anota números de página cuando showPageNumbers=true", () => {
    const doc: SdocDocument = {
      type: "document",
      version: "1.0",
      pages: [
        { id: "page_001", order: 1, elements: [] },
        { id: "page_002", order: 2, elements: [] },
      ],
    };
    const html = renderDocumentToHtml(doc, { showPageNumbers: true });
    expect(html).toContain("página 1 / 2");
    expect(html).toContain("página 2 / 2");
  });
});
