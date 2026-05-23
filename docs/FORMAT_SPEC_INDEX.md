# FORMAT_SPEC_INDEX.md — Índice del Formato `.sdoc`

> Este archivo es el **mapa del formato `.sdoc`** dentro de `SPEC.md`.
> Su propósito: que cualquier IA pueda saltar directo al pedazo de spec
> que necesita sin leer 7.700 líneas cada vez.
>
> **Pero ojo:** este es un índice, **no un reemplazo** de `SPEC.md`. Antes
> de escribir código sobre el formato, **lee la sección completa** referenciada.

---

## 1. Qué es `.sdoc` en una frase

Un archivo `.sdoc` es un **contenedor ZIP** con una estructura interna fija
de archivos JSON y assets, que representa un documento vivo: colaborativo,
versionable, firmable, cifrable, exportable y siempre portable.

Es a `.pdf` lo que `.pdf` fue a `.ps`: el siguiente paso en formatos de
documento.

---

## 2. Estructura Interna del Archivo (SPEC.md §6, líneas ~1264–1297)

```
documento.sdoc (ZIP)
├── manifest.json             ← Metadatos globales (SIEMPRE presente)
├── content/
│   ├── document.json         ← Contenido estructurado (nodos)
│   ├── styles.json           ← Tema y estilos
│   └── layout.json           ← Layout/páginas
├── assets/
│   ├── images/               ← WebP preferido
│   ├── videos/               ← Solo referenciados si >10MB
│   └── fonts/                ← Tipografías embebidas
├── revisions/
│   ├── index.json            ← Índice de revisiones
│   └── patches/
│       └── patch-NNN.json    ← Diffs diferenciales
├── sync/
│   ├── crdt-state.bin        ← Estado Yjs serializado
│   └── pending-ops.json      ← Ops pendientes de sync
├── permissions/
│   └── acl.json              ← ACL del documento
├── security/
│   ├── signature.json        ← Firma Ed25519 del documento
│   └── encryption-meta.json  ← Metadatos de cifrado (NO la clave)
└── preview/
    ├── thumbnail.webp        ← 400x300px
    ├── preview.pdf           ← Primeras 3 páginas
    └── preview.html          ← Fallback universal
```

**Regla:** cualquier archivo `.sdoc` válido **DEBE** incluir, como mínimo,
`manifest.json` y `content/document.json`. El resto es opcional según las
features activadas.

---

## 3. `manifest.json` — Esquema Completo (SPEC.md §6, ~1299–1342)

```json
{
  "$schema": "https://sdoc.app/schemas/manifest/v1.json",
  "formatVersion": "1.0.0",
  "id": "doc_01J8XKQM5N3P7R9T2V4W6Y8Z0",
  "title": "...",
  "description": "...",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "version": <integer>,
  "schemaVersion": "1.0.0",
  "owner": {
    "id": "usr_...",
    "email": "...",
    "name": "..."
  },
  "settings": {
    "syncEnabled": boolean,
    "offlineEnabled": boolean,
    "collaborationEnabled": boolean,
    "versioningEnabled": boolean,
    "maxVersions": integer,
    "autoSaveIntervalSeconds": integer
  },
  "security": {
    "encryption": "AES-256-GCM",
    "keyDerivation": "HKDF-SHA256",
    "contentChecksum": "sha256:...",
    "manifestChecksum": "sha256:...",
    "signatureAlgorithm": "Ed25519",
    "signatureRef": "security/signature.json",
    "encryptedContent": boolean
  },
  "meta": {
    "wordCount": integer,
    "pageCount": integer,
    "readingTimeSeconds": integer,
    "language": "iso-639-1",
    "tags": ["...", "..."],
    "aiGenerated": boolean
  }
}
```

**Reglas:**
- `id` usa formato ULID prefijado: `doc_<ulid>`.
- `formatVersion` indica la versión del formato `.sdoc` (semver).
- `schemaVersion` indica la versión del schema interno (semver).
- Cuando se modifica el documento, `version` se incrementa y `updatedAt`
  se actualiza.
- Los checksums son SHA-256 hexadecimal con prefijo `sha256:`.

---

## 4. `content/document.json` — Estructura de Nodos (SPEC.md §6, ~1345–1379)

Estructura de árbol de páginas y elementos:

```json
{
  "type": "document",
  "version": "1.0",
  "pages": [
    {
      "id": "page_001",
      "order": 1,
      "size": { "width": 794, "height": 1123, "unit": "px" },
      "margins": { "top": 72, "right": 72, "bottom": 72, "left": 72 },
      "elements": [ /* array de nodos */ ]
    }
  ]
}
```

### Tipos de nodos soportados (en `elements[]`)

| `type` | Descripción | Atributos relevantes |
|---|---|---|
| `heading` | Encabezado | `attrs.level: 1..6`, `children: TextNode[]` |
| `paragraph` | Párrafo | `children: TextNode[]` |
| `image` | Imagen | `src`, `alt`, `width`, `height`, `alignment` |
| `table` | Tabla | `rows`, `cols`, `cells[]` |
| `codeblock` | Bloque de código | `language`, `content` |
| `embed` | Contenido embebido (chart, 3D, video…) | `embedType`, `data`, `fallback` |

### `TextNode`

```json
{
  "type": "text",
  "content": "texto literal",
  "marks": ["bold", "italic", "underline", "code", "strike", ...]
}
```

**Reglas:**
- IDs de elementos: prefijo `e` + número (`e001`, `e002`, …).
- IDs de páginas: prefijo `page_` + número con padding (`page_001`).
- Coordenadas y tamaños en píxeles por defecto.
- `assets/images/*.webp` se referencia desde `image.src` con ruta relativa
  dentro del ZIP.

---

## 5. Seguridad del Formato (SPEC.md §9, líneas ~2310–2800)

### Cifrado

- Algoritmo: **AES-256-GCM**
- KDF: **HKDF-SHA256** con salt único por documento
- Clave maestra: derivada de la contraseña del usuario o de Vault
- IV (nonce) de 12 bytes, único por operación
- Tag de autenticación (GCM) de 16 bytes

### Firma

- Algoritmo: **Ed25519**
- Se firma el hash SHA-256 del `manifest.json` + `content/document.json`
  serializados en orden canónico (JSON Canonical Form / RFC 8785)
- La firma vive en `security/signature.json`:

```json
{
  "algorithm": "Ed25519",
  "signedAt": "ISO-8601",
  "signedBy": {
    "userId": "usr_...",
    "publicKeyFingerprint": "sha256:..."
  },
  "signedHash": "sha256:...",
  "signature": "base64..."
}
```

### Permisos (`permissions/acl.json`)

ACL embebido en el archivo:

```json
{
  "owner": "usr_...",
  "entries": [
    {
      "subject": { "type": "user|group", "id": "..." },
      "permission": "READ|COMMENT|EDIT|MANAGE|OWNER",
      "expiresAt": "ISO-8601 | null"
    }
  ]
}
```

---

## 6. Sincronización CRDT (SPEC.md §7.3, §12)

- **Estado CRDT:** Yjs binario, serializado en `sync/crdt-state.bin`.
- **Ops pendientes:** acumuladas en `sync/pending-ops.json` cuando se trabaja
  offline.
- Al sincronizar:
  1. El cliente envía `crdt-state.bin` + `pending-ops.json` al `sync-service`.
  2. El servidor hace merge con el estado canónico (Redis + Kafka).
  3. Responde con el nuevo estado merged.
  4. El cliente reemplaza `crdt-state.bin` y limpia `pending-ops.json`.

---

## 7. Revisiones e Historial (SPEC.md §7.6)

```
revisions/
├── index.json              ← Lista cronológica de versiones
└── patches/
    └── patch-NNN.json      ← Diff entre versión N-1 y N
```

`index.json`:

```json
{
  "versions": [
    {
      "n": 42,
      "createdAt": "ISO-8601",
      "createdBy": "usr_...",
      "changeSummary": "...",
      "isAuto": false,
      "patchRef": "patches/patch-042.json",
      "snapshotRef": "snapshots/v042.json" /* opcional, en MinIO */
    }
  ]
}
```

**Política:** snapshot completo cada N (configurable, default 10) versiones;
patches diferenciales entre snapshots.

---

## 8. Preview (SPEC.md §6)

`preview/` permite que cualquier visor genérico muestre algo, incluso sin
parser `.sdoc`:

- `preview/thumbnail.webp`: 400×300, primera página rasterizada.
- `preview/preview.pdf`: primeras 3 páginas rasterizadas a PDF.
- `preview/preview.html`: HTML auto-contenido como fallback universal.

**Regla:** el preview NUNCA debe revelar contenido cifrado del documento
si `manifest.security.encryptedContent = true`.

---

## 9. Casos de Uso Críticos para Validar la Implementación

Cualquier librería que diga ser "compatible con `.sdoc`" debe poder:

| Caso | Operación | Mínimo aceptable |
|---|---|---|
| C1 | Crear un `.sdoc` con título y un párrafo | Manifest válido + content/document.json + abre en otra lib |
| C2 | Validar un `.sdoc` contra el JSON Schema oficial | OK / lista de errores |
| C3 | Leer un `.sdoc` cifrado dando la contraseña correcta | Devuelve manifest + content |
| C4 | Rechazar lectura de `.sdoc` con firma inválida | Error específico |
| C5 | Empaquetar imágenes en `assets/images/` y referenciarlas en `document.json` | Resuelve refs al leer |
| C6 | Crear nueva versión: genera patch + actualiza `index.json` + bump `manifest.version` | Patch decodificable |
| C7 | Generar preview HTML auto-contenido | Visible en cualquier navegador sin servidor |
| C8 | Round-trip: leer `.sdoc` → modificar → escribir → reabrir | Resultado idéntico estructuralmente |

---

## 10. Lo que NO Es un `.sdoc` (Anti-Patrones)

❌ Un blob JSON suelto en disco (sin ZIP, sin estructura interna).
❌ Un PDF con metadatos añadidos.
❌ Un `.docx` renombrado.
❌ Un documento sin `manifest.json`.
❌ Un documento sin `content/document.json`.
❌ Un documento cuyo `manifest.security.contentChecksum` no coincide con
   el SHA-256 real del contenido (debe rechazarse).
❌ Un documento con firma Ed25519 inválida (debe rechazarse o marcarse).

---

## 11. Referencias Cruzadas en `SPEC.md`

| Tema | Sección |
|---|---|
| Definición del formato (estructura ZIP) | §6 |
| `manifest.json` schema | §6 |
| `document.json` schema | §6 |
| Tipos de nodos | §6 |
| Cifrado AES-256-GCM + HKDF | §9.5 |
| Firmas Ed25519 | §9.6 |
| Vault para gestión de claves | §9.1 |
| Sincronización Yjs CRDT | §7.3, §12 |
| Versionado e historial | §7.6 |
| Generación de previews / exports | §7.4 (render-service) |
| Permisos OPA | §9.4 |
| Schema Registry para eventos | §Componente C |

---

## 12. Implementación Pendiente (vs. Estado Actual)

Ver `docs/PROJECT_OVERVIEW.md` §4 Gap 1 para detalle. Resumen:

| Pieza | Carpeta esperada | Estado |
|---|---|---|
| JSON Schemas | `packages/sdoc-format/schemas/` | ❌ Pendiente |
| Lib TS read/write/validate | `packages/sdoc-format/src/` | ❌ Pendiente |
| Firma + verificación Ed25519 | `packages/sdoc-format/src/crypto/` | ❌ Pendiente |
| Cifrado + descifrado AES-GCM | `packages/sdoc-format/src/crypto/` | ❌ Pendiente |
| CLI `sdoc` | `packages/sdoc-cli/` | ❌ Pendiente |
| Ejemplos | `packages/sdoc-format/examples/` | ❌ Pendiente |
| Integración en `apps/web` (import/export) | `apps/web/src/services/` | ❌ Pendiente |

---

*Si necesitas más detalle, **lee la sección correspondiente de `SPEC.md`**.*
*Este índice es entrada, no es spec.*
