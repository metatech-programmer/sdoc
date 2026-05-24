# @sdoc/viewer

> Viewer read-only embebible del formato `.sdoc`. Sin dependencias de framework — vanilla DOM.

```bash
npm install @sdoc/viewer @sdoc/format
```

## Uso básico

```ts
import { mountSdocViewer } from "@sdoc/viewer";
import "@sdoc/viewer/style.css";

const res = await fetch("documento.sdoc");
const bytes = new Uint8Array(await res.arrayBuffer());

const handle = await mountSdocViewer(document.getElementById("viewer")!, {
  source: bytes,
  theme: "auto",          // "light" | "dark" | "auto"
  verifySignature: true,  // verifica Ed25519 si el .sdoc está firmado
});

console.log(handle.file.manifest.title);
console.log(handle.signatureValid);

// Más tarde:
handle.destroy();
```

## Desde URL

```ts
import { mountSdocViewerFromUrl } from "@sdoc/viewer";
await mountSdocViewerFromUrl(container, "/api/v1/documents/abc/download.sdoc");
```

## SSR / HTML estático

```ts
import { renderDocumentToHtml } from "@sdoc/viewer";
import { parseSdoc } from "@sdoc/format";

const file = await parseSdoc(bytes);
const html = renderDocumentToHtml(file.document, {
  assetUrl: (p) => `https://cdn.example.com/${p}`,
  showPageNumbers: true,
});
// → string HTML listo para embebir
```

## API

### `mountSdocViewer(container, options)`

Parsea + monta el viewer en el contenedor. Opciones:

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `source` | `Uint8Array \| SdocFile` | — | Bytes del .sdoc o archivo ya parseado |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Sigue `prefers-color-scheme` si auto |
| `verifySignature` | `boolean` | `true` | Verifica firma Ed25519 si existe |
| `showHeader` | `boolean` | `true` | Muestra título + autor + badges |
| `showPageNumbers` | `boolean` | `false` | Anota "página N / total" |
| `assetUrl` | `(path) => string` | identidad | Resuelve URLs de assets embebidos |
| `lang` | `string` | manifest.meta.language | `lang` attribute del contenedor |

Retorna `{ file, signatureValid, destroy }`.

### `renderDocumentToHtml(doc, options?)`

Sin DOM, devuelve string HTML del `SdocDocument`. Útil para SSR.

## Seguridad

El viewer **siempre** escapa contenido textual del usuario. Embeds (charts, 3D) NO se ejecutan: solo se muestra `fallback`.

## Tipos de nodos renderizados

`heading` (h1-h6), `paragraph`, `image` (`<figure>`), `table`, `codeblock` (`<pre><code>`), `embed` (placeholder con fallback). Marcas: `bold`, `italic`, `underline`, `strike`, `code`, `highlight`, `link`.

## Tests

```bash
npm test -w packages/sdoc-viewer
```

## Licencia

MIT — ver [`LICENSE`](../../LICENSE).
