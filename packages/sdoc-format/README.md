# @sdoc/format

> Librería oficial del formato **`.sdoc`** — parser, validador, firma Ed25519, cifrado AES-256-GCM.

`.sdoc` es un formato de archivo abierto (ZIP + JSON) para documentos vivos: colaborativos, offline-first, firmables, cifrables y siempre portables. Esta librería es la implementación de referencia de la spec definida en [`SPEC.md`](../../SPEC.md) §6 y §9.3.

[![tests](https://img.shields.io/badge/tests-37%2F37-16A34A)](#tests)
[![format version](https://img.shields.io/badge/format-1.0.0-0F172A)](../../SPEC.md)
[![License](https://img.shields.io/badge/license-MIT-F59E0B)](../../LICENSE)

---

## Por qué `.sdoc`

| Problema con `.pdf`, `.docx`, `.notion` | Cómo lo resuelve `.sdoc` |
|---|---|
| Cerrado / propietario | ZIP + JSON; cualquier app puede leerlo |
| No colaborativo nativo | Incluye estado CRDT (Yjs) dentro del archivo |
| Requiere servidor para vivir | Auto-contenido: historial, permisos y firma viajan dentro |
| Sin firma criptográfica | Ed25519 embebido (autoría e integridad verificables) |
| Sin cifrado por documento | AES-256-GCM con clave derivada HKDF-SHA256 |
| Difícil de versionar | Estructura `revisions/` con patches diferenciales |

---

## Instalación

```bash
npm install @sdoc/format
```

Requiere **Node 20+** o un navegador moderno (Chrome 124+, Firefox 130+, Safari 17+). Usa Web Crypto API nativa — cero dependencias de polyfills cripto.

### Dependencias

- `fflate` — ZIP (8 KB gzip)
- `ajv` + `ajv-formats` — validación JSON Schema

---

## Uso básico

### Crear un `.sdoc` desde cero

```ts
import { createSdoc, serializeSdoc } from "@sdoc/format";

const file = await createSdoc({
  title: "Mi primer documento",
  owner: { id: "usr_01HXYZ...", email: "yo@correo.com" },
  language: "es-CO",
});

const bytes = await serializeSdoc(file); // Uint8Array — lista para escribir/descargar
```

### Leer un `.sdoc` existente

```ts
import { parseSdoc } from "@sdoc/format";

const bytes = await fetch("documento.sdoc").then((r) => r.arrayBuffer());
const file = await parseSdoc(new Uint8Array(bytes));

console.log(file.manifest.title);           // "Mi primer documento"
console.log(file.document.pages.length);    // 1
console.log(file.manifest.security.contentChecksum);
// sha256:... ← se valida automáticamente
```

Si el archivo está corrupto, alterado o tiene un schema inválido, `parseSdoc` **lanza** con detalles. Para parsear sin validación (útil en tests), pasa `{ validate: false }`.

### Firmar con Ed25519

```ts
import { ed25519, signSdoc, verifySdocSignature } from "@sdoc/format";

// Generar par de claves
const keys = await ed25519.generateKeyPair();
// { publicKey: "base64...", privateKey: "base64..." }

// Firmar
const signed = await signSdoc({
  file,
  privateKey: keys.privateKey,
  publicKey: keys.publicKey,
  signedBy: { userId: "usr_01HXYZ..." },
});

// Verificar
const result = await verifySdocSignature(signed);
console.log(result.valid); // true
```

La firma se calcula sobre `SHA-256(canonical(manifest) || canonical(document))`. Cualquier alteración invalida la firma.

### Cifrar con AES-256-GCM

```ts
import { encryptSdoc, decryptSdoc, aesGcm } from "@sdoc/format";

// Derivar masterKey desde una contraseña (PBKDF2)
const salt = crypto.getRandomValues(new Uint8Array(16));
const masterKey = await aesGcm.deriveMasterKeyFromPassword("mi-clave", salt);

// Cifrar
const { bytes, encryptionMeta } = await encryptSdoc({ file, masterKey });

// Descifrar
const recovered = await decryptSdoc({ bytes, masterKey });
console.log(recovered.manifest.title); // "Mi primer documento"
```

El cifrado usa HKDF-SHA256 con `info = "sdoc-v1:document:<id>:<hex(iv)>"`, AAD = `documentId`, y verifica integridad con el checksum SHA-256 del plaintext.

### Validar contra el JSON Schema

```ts
import { validateSdocFile } from "@sdoc/format";

const result = await validateSdocFile(file);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(`[${err.file}] ${err.path}: ${err.message}`);
  }
}
```

---

## CLI

El paquete incluye un binario `sdoc` con comandos para terminal:

```bash
# Crear un .sdoc vacío
npx sdoc init mi-doc.sdoc --title "Mi documento"

# Mostrar metadata
npx sdoc info mi-doc.sdoc

# Validar
npx sdoc validate mi-doc.sdoc

# Extraer el ZIP
npx sdoc extract mi-doc.sdoc /tmp/contenido

# Re-empaquetar un directorio
npx sdoc pack /tmp/contenido nuevo.sdoc

# Firmar
npx sdoc keygen        # genera un par Ed25519
npx sdoc sign mi-doc.sdoc --priv "BASE64" --pub "BASE64" --user usr_01HXYZ...

# Verificar firma
npx sdoc verify mi-doc.sdoc
```

---

## Estructura del archivo `.sdoc`

Definida en [`SPEC.md`](../../SPEC.md) §6:

```
documento.sdoc (ZIP)
├── manifest.json             ← Metadata global (OBLIGATORIO)
├── content/
│   ├── document.json         ← Árbol de nodos (OBLIGATORIO)
│   ├── styles.json           ← Tema y estilos (opcional)
│   └── layout.json           ← Layout / páginas (opcional)
├── assets/                   ← Imágenes, videos, fuentes
├── revisions/
│   ├── index.json            ← Índice de versiones
│   └── patches/              ← Diffs diferenciales
├── sync/
│   ├── crdt-state.bin        ← Estado Yjs serializado
│   └── pending-ops.json
├── permissions/
│   └── acl.json              ← ACL embebido
├── security/
│   ├── signature.json        ← Firma Ed25519
│   └── encryption-meta.json  ← Meta de cifrado (NO contiene la clave)
└── preview/
    ├── thumbnail.webp        ← 400×300
    ├── preview.pdf           ← Primeras 3 páginas
    └── preview.html          ← Fallback universal
```

---

## JSON Schemas

5 schemas publicados bajo `src/schemas/`:

| Schema | `$id` | Cubre |
|---|---|---|
| `manifest.v1.json` | `https://sdoc.app/schemas/manifest/v1.json` | Metadata global del archivo |
| `document.v1.json` | `https://sdoc.app/schemas/document/v1.json` | Árbol de contenido (nodos) |
| `acl.v1.json` | `https://sdoc.app/schemas/acl/v1.json` | Permisos embebidos |
| `signature.v1.json` | `https://sdoc.app/schemas/signature/v1.json` | Estructura de firma Ed25519 |
| `encryption-meta.v1.json` | `https://sdoc.app/schemas/encryption-meta/v1.json` | Metadata de cifrado |

Se exportan también como módulos:

```ts
import { schemas } from "@sdoc/format";
console.log(schemas.manifest); // JSON Schema object
```

---

## Tipos de nodos soportados (v1.0)

| Tipo | Campos | Descripción |
|---|---|---|
| `heading` | `attrs.level` (1–6), `children` | Encabezado |
| `paragraph` | `children` | Párrafo de texto |
| `image` | `src`, `alt`, `width`, `height`, `alignment` | Imagen (ref a `assets/images/`) |
| `table` | `rows`, `cols`, `cells` | Tabla |
| `codeblock` | `language`, `content` | Bloque de código |
| `embed` | `embedType`, `data`, `fallback` | Contenido embebido (charts, 3D…) |

Marcas de texto soportadas: `bold`, `italic`, `underline`, `strike`, `code`, `link`, `highlight`.

---

## Garantías criptográficas

Según [`SPEC.md`](../../SPEC.md) §9.3:

- **Cifrado:** AES-256-GCM, IV 12 bytes (96 bits), tag 128 bits, AAD = `documentId`.
- **Derivación de clave:** HKDF-SHA256 con `info = "sdoc-v1:document:<id>:<hex(iv)>"`.
- **Firma:** Ed25519 sobre `SHA-256(canonical(manifest) || canonical(document))`.
- **Canonicalización JSON:** RFC 8785-lite (claves ordenadas lex., sin espacios, escape estándar). Garantiza checksums reproducibles entre lenguajes.

---

## Ejemplos reales

Tres `.sdoc` válidos en [`examples/`](examples/):

```bash
node packages/sdoc-format/examples/generate.mjs
# OK simple.sdoc       ~1.3 KB
# OK signed.sdoc       ~1.5 KB (firmado Ed25519)
# OK encrypted.sdoc    ~1.7 KB (password "demo-1234")

node packages/sdoc-format/dist/cli/index.js info examples/simple.sdoc
node packages/sdoc-format/dist/cli/index.js validate examples/signed.sdoc
node packages/sdoc-format/dist/cli/index.js verify examples/signed.sdoc
```

---

## Tests

37/37 tests pasan (Vitest):

```bash
npm test -w packages/sdoc-format
```

Cobertura:
- Round-trip create → serialize → parse (binarios, assets, ACL, preview).
- Rechazo de ZIP sin `manifest.json` o `document.json`.
- Detección de tampering por checksum mismatch.
- Generación, firma y verificación Ed25519.
- Cifrado/descifrado AES-256-GCM (clave correcta, clave incorrecta, AAD distinta).
- Derivación PBKDF2 desde contraseña.
- Validación JSON Schema (manifest, document, heading).
- Canonicalización JSON (orden, undefined, NaN, escape).

---

## API completa

### `createSdoc(input): Promise<SdocFile>`

Crea un `.sdoc` vacío con manifest + un párrafo en blanco.

### `serializeSdoc(file): Promise<Uint8Array>`

Serializa a bytes. Recalcula checksums si el archivo no está firmado;
preserva si lo está.

### `parseSdoc(bytes, opts?): Promise<SdocFile>`

Lee bytes ZIP → `SdocFile`. Valida estructura, schemas y checksums por defecto.
Opciones: `{ validate?: boolean, skipChecksums?: boolean }`.

### `signSdoc(input): Promise<SdocFile>`

Firma con Ed25519. `input: { file, privateKey, publicKey, signedBy: { userId } }`.

### `verifySdocSignature(file): Promise<{ valid, reason? }>`

Verifica firma embebida.

### `encryptSdoc(input): Promise<{ bytes, encryptionMeta }>`

Cifra el bundle `document + acl` con AES-256-GCM + HKDF.

### `decryptSdoc(input): Promise<SdocFile>`

Descifra y devuelve el `SdocFile`.

### `validateSdocFile(file): Promise<ValidationResult>`

Valida schemas + checksums.

### Utilidades

- `ulid()`, `documentId()`, `userId()`, `isUlid(s)` — generación de IDs.
- `canonicalize(value)`, `canonicalChecksum(value)` — JSON canónico.
- `sha256(bytes)`, `sha256Hex(bytes)`, `bytesToHex`, `bytesToBase64`, `base64ToBytes`, `timingSafeEqual`.

### Submódulos

- `ed25519`: `generateKeyPair`, `sign`, `verify`, `publicKeyFingerprint`.
- `aesGcm`: `encrypt`, `decrypt`, `deriveMasterKeyFromPassword`, `buildInfo`.

### Schemas

```ts
import { schemas } from "@sdoc/format";
// schemas.manifest, schemas.document, schemas.acl, schemas.signature, schemas.encryptionMeta
```

---

## Roadmap

- [x] Spec del formato v1.0 (SPEC.md §6)
- [x] JSON Schemas (5)
- [x] Parser + Serializer (ZIP)
- [x] Validador (Ajv 2020-12)
- [x] Crypto: Ed25519 + AES-256-GCM + HKDF + PBKDF2
- [x] CLI (`sdoc init/info/validate/extract/pack/sign/verify/keygen`)
- [x] Ejemplos `.sdoc` reales
- [x] 37 tests Vitest
- [ ] Streaming parser para archivos grandes (>50 MB)
- [ ] Integración nativa con Yjs para CRDT round-trip
- [ ] Generación de previews (thumbnail.webp, preview.pdf)
- [ ] Schemas v2 con plugins de comunidad

---

## Licencia

MIT — ver [`LICENSE`](../../LICENSE).

Si construyes algo sobre `.sdoc`, dilo en un issue del repo principal. Toda implementación compatible con la spec es bienvenida.
