#!/usr/bin/env node
/**
 * Build estático del sitio de la spec.
 *
 * Genera `dist/` con:
 *   - index.html        — landing con visión + estructura
 *   - spec.html         — versión navegable de SPEC.md
 *   - schemas.html      — listado de los JSON Schemas oficiales
 *   - examples.html     — ejemplos descargables
 *   - schemas/*.json    — los 5 JSON Schemas (copiados desde @sdoc/format)
 *   - examples/*.sdoc   — los 3 ejemplos (copiados desde @sdoc/format)
 *   - style.css         — estilos compartidos
 *
 * No usa frameworks: HTML + CSS + JS vanilla. Pensado para GitHub Pages.
 */

import { writeFile, mkdir, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");
const SPEC_PATH = resolve(ROOT, "SPEC.md");
const SCHEMAS_DIR = resolve(ROOT, "packages/sdoc-format/src/schemas");
const EXAMPLES_DIR = resolve(ROOT, "packages/sdoc-format/examples");
const OUT = resolve(here, "dist");
const PUBLIC = resolve(here, "public");

const VERSION = "1.0.0";
const TITLE = "SDOC — Especificación del formato .sdoc";

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(join(OUT, "schemas"), { recursive: true });
  await mkdir(join(OUT, "examples"), { recursive: true });

  // 1. Copiar schemas
  let schemaCount = 0;
  for (const f of await readdir(SCHEMAS_DIR)) {
    if (f.endsWith(".json")) {
      await copyFile(join(SCHEMAS_DIR, f), join(OUT, "schemas", f));
      schemaCount++;
    }
  }
  console.log(`  Copiados ${schemaCount} schemas → dist/schemas/`);

  // 2. Copiar ejemplos
  let exampleCount = 0;
  if (existsSync(EXAMPLES_DIR)) {
    for (const f of await readdir(EXAMPLES_DIR)) {
      if (f.endsWith(".sdoc")) {
        await copyFile(join(EXAMPLES_DIR, f), join(OUT, "examples", f));
        exampleCount++;
      }
    }
  }
  console.log(`  Copiados ${exampleCount} ejemplos → dist/examples/`);

  // 3. Copiar SPEC.md crudo (para fetch directo desde JS)
  if (existsSync(SPEC_PATH)) {
    await copyFile(SPEC_PATH, join(OUT, "SPEC.md"));
    console.log(`  SPEC.md copiado (${(await stat(SPEC_PATH)).size} bytes)`);
  }

  // 4. Generar páginas HTML
  await writeFile(join(OUT, "style.css"), STYLE);
  await writeFile(join(OUT, "index.html"), pageIndex());
  await writeFile(join(OUT, "spec.html"), pageSpec());
  await writeFile(join(OUT, "schemas.html"), pageSchemas());
  await writeFile(join(OUT, "examples.html"), pageExamples());
  await writeFile(join(OUT, ".nojekyll"), "");

  // 5. CNAME si está configurado (para custom domain en GH Pages)
  if (existsSync(join(PUBLIC, "CNAME"))) {
    await copyFile(join(PUBLIC, "CNAME"), join(OUT, "CNAME"));
  }

  console.log(`\nSitio generado en ${OUT}`);
  console.log("  Previsualiza: npm run preview -w apps/spec-site");
}

// ============================================================
// Plantillas
// ============================================================

function shell(activePage, title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="Especificación oficial del formato de archivo abierto .sdoc — ZIP+JSON, firmable, cifrable, colaborativo.">
  <link rel="stylesheet" href="./style.css">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="./index.html" class="brand">
        <span class="brand-logo">${LOGO_SVG_INLINE}</span>
        <span class="brand-text">SDOC <span class="brand-version">v${VERSION}</span></span>
      </a>
      <nav class="site-nav">
        <a href="./index.html" class="${activePage === "home" ? "active" : ""}">Inicio</a>
        <a href="./spec.html" class="${activePage === "spec" ? "active" : ""}">Spec</a>
        <a href="./schemas.html" class="${activePage === "schemas" ? "active" : ""}">Schemas</a>
        <a href="./examples.html" class="${activePage === "examples" ? "active" : ""}">Ejemplos</a>
        <a href="https://github.com/metatech-programmer/sdoc" class="ext">GitHub →</a>
      </nav>
    </div>
  </header>
  <main class="container main-content">${bodyHtml}</main>
  <footer class="site-footer">
    <div class="container">
      <p>SDOC · Formato de archivo abierto · Licencia MIT · Hecho en Medellín, Colombia.</p>
      <p class="footer-meta">
        <a href="./SPEC.md">SPEC.md crudo</a> ·
        <a href="https://github.com/metatech-programmer/sdoc/issues">Reportar</a> ·
        <a href="https://github.com/metatech-programmer/sdoc/releases">Versiones</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
}

function pageIndex() {
  return shell("home", TITLE, `
    <section class="hero">
      <p class="eyebrow">Open file format · v${VERSION}</p>
      <h1>Un formato de archivo abierto para documentos vivos.</h1>
      <p class="lead">
        <code>.sdoc</code> es un contenedor ZIP+JSON con estructura estricta:
        contenido, historial, permisos, firma Ed25519 y assets — todo en un
        solo archivo portable, validable y firmable. Libre bajo MIT.
      </p>
      <div class="cta">
        <a href="./spec.html" class="btn btn-primary">Leer la especificación</a>
        <a href="./schemas.html" class="btn btn-ghost">Ver JSON Schemas →</a>
      </div>
    </section>

    <section class="features">
      <h2>Por qué un formato nuevo</h2>
      <div class="grid">
        <div class="card"><h3>Auto-contenido</h3><p>Historial, permisos, firma y assets viajan dentro del archivo. No depende de un servidor para vivir.</p></div>
        <div class="card"><h3>Abierto</h3><p>ZIP + JSON con schemas públicos. Cualquier herramienta puede leerlo, validarlo, escribirlo.</p></div>
        <div class="card"><h3>Colaborativo nativo</h3><p>Incluye estado CRDT (Yjs) opcional para continuar la edición sincronizada desde el archivo.</p></div>
        <div class="card"><h3>Firmable y cifrable</h3><p>Ed25519 para autoría e integridad. AES-256-GCM + HKDF-SHA256 para confidencialidad.</p></div>
        <div class="card"><h3>Multiformato</h3><p>Exporta a PDF, DOCX, HTML, EPUB. <code>.sdoc</code> es la fuente de verdad, los otros son proyecciones.</p></div>
        <div class="card"><h3>Universal</h3><p>Preview HTML auto-contenido + thumbnail. Cualquier visor genérico muestra algo, incluso sin parser.</p></div>
      </div>
    </section>

    <section class="quickstart">
      <h2>Crear un <code>.sdoc</code> en 3 líneas</h2>
      <pre class="code"><code>import { createSdoc, serializeSdoc } from "@sdoc/format";

const file = await createSdoc({ title: "Mi documento", owner: { id: "usr_..." } });
const bytes = await serializeSdoc(file); // → Uint8Array listo para descargar</code></pre>

      <h2 style="margin-top:3rem">Validar un <code>.sdoc</code></h2>
      <pre class="code"><code>$ npx sdoc validate documento.sdoc
OK documento.sdoc es un .sdoc válido
OK firma Ed25519 válida</code></pre>
    </section>

    <section class="anatomy">
      <h2>Estructura interna</h2>
      <pre class="tree"><code>documento.sdoc (ZIP)
├── manifest.json             # Metadata global (OBLIGATORIO)
├── content/
│   ├── document.json         # Árbol de nodos (OBLIGATORIO)
│   ├── styles.json
│   └── layout.json
├── assets/                   # Imágenes, videos, fuentes
├── revisions/
│   ├── index.json            # Índice de versiones
│   └── patches/              # Diffs diferenciales
├── sync/
│   ├── crdt-state.bin        # Estado Yjs serializado
│   └── pending-ops.json
├── permissions/
│   └── acl.json              # ACL embebido
├── security/
│   ├── signature.json        # Firma Ed25519
│   └── encryption-meta.json  # Meta de cifrado (NO contiene la clave)
└── preview/
    ├── thumbnail.webp
    ├── preview.pdf
    └── preview.html          # Fallback universal</code></pre>
    </section>
  `);
}

function pageSpec() {
  return shell("spec", "SPEC.md · SDOC", `
    <section>
      <p class="eyebrow">Documento maestro · 7700+ líneas</p>
      <h1>Especificación SDOC Platform</h1>
      <p class="lead">
        El documento <a href="./SPEC.md">SPEC.md</a> es la única fuente de
        verdad del formato y la plataforma. Se renderiza abajo a partir del
        Markdown crudo.
      </p>
      <p>
        <a href="./SPEC.md" class="btn btn-ghost">Descargar SPEC.md (raw)</a>
        <a href="https://github.com/metatech-programmer/sdoc/blob/main/SPEC.md" class="btn btn-ghost">Ver en GitHub →</a>
      </p>
    </section>
    <article id="spec-content" class="prose">
      <p>Cargando SPEC.md…</p>
    </article>
    <script>
      fetch("./SPEC.md").then(r => r.text()).then(md => {
        document.getElementById("spec-content").innerHTML = renderMd(md);
      }).catch(() => {
        document.getElementById("spec-content").innerHTML =
          '<p style="color:#B91C1C">No se pudo cargar SPEC.md</p>';
      });

      function renderMd(md) {
        const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        const lines = md.split(/\\r?\\n/);
        const out = [];
        let inCode = false, codeBuf = [];
        for (const ln of lines) {
          const fence = ln.match(/^\`\`\`(.*)$/);
          if (fence) {
            if (inCode) {
              out.push('<pre class="code"><code>' + esc(codeBuf.join("\\n")) + '</code></pre>');
              codeBuf = []; inCode = false;
            } else { inCode = true; }
            continue;
          }
          if (inCode) { codeBuf.push(ln); continue; }
          const h = ln.match(/^(#{1,6})\\s+(.+)$/);
          if (h) {
            const lvl = h[1].length;
            const text = esc(h[2]);
            const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
            out.push('<h' + lvl + ' id="' + id + '">' + text + '</h' + lvl + '>');
            continue;
          }
          if (/^[-*]\\s/.test(ln)) {
            out.push('<li>' + inline(ln.replace(/^[-*]\\s/, '')) + '</li>');
            continue;
          }
          if (/^\\|.+\\|$/.test(ln)) { out.push('<div class="md-table-row">' + esc(ln) + '</div>'); continue; }
          if (!ln.trim()) { out.push(''); continue; }
          out.push('<p>' + inline(ln) + '</p>');
        }
        return out.join('\\n');
      }

      function inline(s) {
        return s
          .replace(/\`([^\`]+)\`/g, (_,c)=>'<code>'+c.replace(/</g,'&lt;')+'</code>')
          .replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>')
          .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2">$1</a>');
      }
    </script>
  `);
}

function pageSchemas() {
  const baseUrl = "./schemas";
  const items = [
    { id: "manifest", file: "manifest.v1.json", title: "Manifest v1", desc: "Metadata global del archivo (id, title, owner, security, meta)." },
    { id: "document", file: "document.v1.json", title: "Document v1", desc: "Árbol de contenido (pages, elements, text nodes, marks)." },
    { id: "acl", file: "acl.v1.json", title: "ACL v1", desc: "Lista de control de acceso embebida en el archivo." },
    { id: "signature", file: "signature.v1.json", title: "Signature v1", desc: "Estructura de firma Ed25519 (signedHash + signedBy)." },
    { id: "encryption-meta", file: "encryption-meta.v1.json", title: "Encryption Meta v1", desc: "Metadata de cifrado (algoritmo, KDF, IV, NO contiene clave)." },
  ];

  const cards = items.map(s => `
    <article class="schema-card" id="${s.id}">
      <header>
        <h2>${s.title}</h2>
        <code class="schema-id">https://sdoc.app/schemas/${s.id}/v1.json</code>
      </header>
      <p>${s.desc}</p>
      <div class="schema-actions">
        <a class="btn btn-ghost" href="${baseUrl}/${s.file}">Descargar JSON</a>
        <a class="btn btn-ghost" href="${baseUrl}/${s.file}" target="_blank">Ver crudo →</a>
      </div>
    </article>
  `).join("");

  return shell("schemas", "Schemas · SDOC", `
    <section>
      <p class="eyebrow">JSON Schema 2020-12</p>
      <h1>Schemas oficiales del formato</h1>
      <p class="lead">
        Cinco schemas describen exactamente la estructura interna de un
        archivo <code>.sdoc</code> v1. Úsalos con Ajv, Pydantic, JSON Schema
        Validator de tu lenguaje, o como referencia para implementar un
        parser propio.
      </p>
    </section>
    <section class="schemas-grid">${cards}</section>

    <section class="usage">
      <h2>Uso con Ajv (JavaScript)</h2>
      <pre class="code"><code>import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = await fetch("https://sdoc.app/schemas/manifest/v1.json").then(r => r.json());
const validate = ajv.compile(schema);

if (!validate(myManifest)) {
  console.error(validate.errors);
}</code></pre>
    </section>
  `);
}

function pageExamples() {
  return shell("examples", "Ejemplos · SDOC", `
    <section>
      <p class="eyebrow">Tres .sdoc reales</p>
      <h1>Ejemplos descargables</h1>
      <p class="lead">
        Archivos <code>.sdoc</code> generados por <code>@sdoc/format</code>
        que pasan <code>sdoc validate</code>. Útiles para probar tu
        implementación.
      </p>
    </section>
    <section class="examples-grid">
      <article class="example-card">
        <h2>simple.sdoc</h2>
        <p>Documento mínimo: una página con un título y un párrafo. Sin firma, sin cifrado.</p>
        <a class="btn btn-primary" href="./examples/simple.sdoc" download>Descargar (~1.3 KB)</a>
      </article>
      <article class="example-card">
        <h2>signed.sdoc</h2>
        <p>Documento firmado con Ed25519. Cualquier alteración invalida la firma.</p>
        <a class="btn btn-primary" href="./examples/signed.sdoc" download>Descargar (~1.5 KB)</a>
      </article>
      <article class="example-card">
        <h2>encrypted.sdoc</h2>
        <p>Documento cifrado AES-256-GCM. Contraseña: <code>demo-1234</code>.</p>
        <a class="btn btn-primary" href="./examples/encrypted.sdoc" download>Descargar (~1.7 KB)</a>
      </article>
    </section>

    <section class="usage">
      <h2>Cómo probarlos</h2>
      <pre class="code"><code># Con el CLI oficial
$ npx @sdoc/format info simple.sdoc
$ npx @sdoc/format validate signed.sdoc
$ npx @sdoc/format verify signed.sdoc

# O abrirlos en el editor de referencia
# https://github.com/metatech-programmer/sdoc</code></pre>
    </section>
  `);
}

// ============================================================
// CSS embebido
// ============================================================

const STYLE = `
*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg: #FAFAF7; --fg: #0F172A; --muted: #64748B; --soft: #334155;
  --border: #E5E5DC; --accent: #F59E0B;
  --code-bg: rgba(15,23,42,0.04); --card-bg: #FFFFFF;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0B0E14; --fg: #F1F5F9; --muted: #94A3B8; --soft: #CBD5E1;
    --border: #1F2937; --code-bg: rgba(255,255,255,0.05); --card-bg: #11151D;
  }
}
html, body { margin: 0; padding: 0; }
body {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--fg); background: var(--bg); line-height: 1.6; min-height: 100vh;
}
.container { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  background: var(--code-bg); padding: 0.1em 0.4em; border-radius: 4px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.92em;
}
pre.code, pre.tree {
  background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 1.1em 1.2em; overflow-x: auto;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.875rem; line-height: 1.55;
}
pre.code code, pre.tree code { background: transparent; padding: 0; }
.site-header {
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 90%, transparent);
  backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 10;
}
.site-header .container {
  display: flex; align-items: center; justify-content: space-between; height: 64px;
}
.brand {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 1.15rem;
  color: var(--fg);
}
.brand-version {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.7rem; font-weight: 500; color: var(--muted); margin-left: 0.4em;
}
.site-nav { display: flex; gap: 1.5rem; align-items: center; }
.site-nav a {
  color: var(--soft); font-size: 0.9rem; font-weight: 500;
  padding: 0.4rem 0; border-bottom: 2px solid transparent;
}
.site-nav a:hover, .site-nav a.active {
  color: var(--fg); text-decoration: none; border-bottom-color: var(--accent);
}
.site-nav a.ext { color: var(--muted); }
.main-content { padding: 3rem 1.5rem 5rem; }
.hero { padding: 2rem 0 3rem; max-width: 760px; }
.eyebrow {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--accent); margin: 0 0 0.75rem;
}
h1 {
  font-family: ui-serif, Georgia, serif; font-weight: 600;
  font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; letter-spacing: -0.025em;
  margin: 0 0 1rem;
}
h2 {
  font-family: ui-serif, Georgia, serif; font-weight: 600; font-size: 1.75rem;
  letter-spacing: -0.015em; margin: 3rem 0 1rem; line-height: 1.2;
}
h3 { font-weight: 600; font-size: 1.15rem; margin: 0 0 0.5rem; }
p.lead { font-size: 1.125rem; color: var(--soft); max-width: 60ch; }
.cta { display: flex; gap: 0.75rem; margin-top: 2rem; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.2rem; border-radius: 8px;
  font-weight: 600; font-size: 0.95rem; text-decoration: none !important;
  transition: all 180ms ease; border: 1px solid transparent;
}
.btn-primary { background: var(--fg); color: var(--bg); }
.btn-primary:hover { background: var(--accent); color: #0F172A; }
.btn-ghost { background: transparent; color: var(--fg); border-color: var(--border); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.features .grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.card {
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.25rem;
}
.card h3 { color: var(--fg); }
.card p { color: var(--soft); font-size: 0.92rem; margin: 0.5rem 0 0; }
.schemas-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  margin-top: 1.5rem;
}
.schema-card {
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.25rem;
}
.schema-card header h2 { margin: 0; font-size: 1.15rem; }
.schema-id {
  display: block; margin: 0.4rem 0 0.8rem;
  font-size: 0.78rem; color: var(--muted); word-break: break-all;
}
.schema-card p { color: var(--soft); font-size: 0.92rem; }
.schema-actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
.examples-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  margin-top: 1.5rem;
}
.example-card {
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.5rem;
}
.example-card h2 {
  margin: 0 0 0.5rem; font-size: 1.15rem;
  font-family: ui-monospace, monospace;
}
.example-card p { color: var(--soft); font-size: 0.92rem; min-height: 3.5em; }
.prose { max-width: 76ch; font-family: ui-serif, Georgia, serif; font-size: 1.05rem; }
.prose h1, .prose h2, .prose h3 { font-family: ui-serif, Georgia, serif; }
.prose h2 { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.prose p { margin: 0 0 1em; }
.prose li { margin: 0.3em 0; }
.prose .md-table-row { font-family: ui-monospace, monospace; font-size: 0.85em; color: var(--muted); }
.site-footer {
  border-top: 1px solid var(--border);
  padding: 2rem 0; margin-top: 4rem;
  color: var(--muted); font-size: 0.875rem;
}
.site-footer .container { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.footer-meta a { color: var(--soft); margin-left: 0.75rem; }
@media (max-width: 640px) {
  .site-header .container {
    flex-direction: column; height: auto;
    padding-top: 0.75rem; padding-bottom: 0.75rem; gap: 0.5rem;
  }
  .site-nav { flex-wrap: wrap; gap: 0.75rem; }
}
`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#0F172A"/><path d="M11 10h12a6 6 0 0 1 6 6v14H17a6 6 0 0 1-6-6V10z" fill="#F59E0B"/><path d="M19 10v8h8" stroke="#0F172A" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M15 21h10M15 25h7" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;

const LOGO_SVG_INLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="28" height="28"><rect width="40" height="40" rx="10" fill="currentColor"/><path d="M11 10h12a6 6 0 0 1 6 6v14H17a6 6 0 0 1-6-6V10z" fill="#F59E0B"/><path d="M19 10v8h8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M15 21h10M15 25h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
