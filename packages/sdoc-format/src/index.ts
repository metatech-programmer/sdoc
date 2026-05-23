/**
 * Librería del formato .sdoc
 * Un archivo .sdoc es un ZIP que contiene:
 *   - content.json  → documento ProseMirror serializado
 *   - metadata.json → metadatos (id, title, version, language, tags…)
 *   - assets/       → archivos embebidos opcionales
 *   - crdt.bin      → estado Yjs serializado (opcional)
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

export interface SdocMetadata {
  id: string;
  title: string;
  version: number;
  language: string;
  tags: string[];
  ownerId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  sdocVersion: "1.0";
}

export interface SdocDocument {
  metadata: SdocMetadata;
  content: unknown;
  crdtState?: Uint8Array;
  assets?: Record<string, Uint8Array>;
}

/**
 * Serializa un SdocDocument a bytes de archivo .sdoc (ZIP).
 */
export function serialize(doc: SdocDocument): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "content.json": strToU8(JSON.stringify(doc.content)),
    "metadata.json": strToU8(JSON.stringify(doc.metadata)),
  };

  if (doc.crdtState) {
    files["crdt.bin"] = doc.crdtState;
  }

  if (doc.assets) {
    for (const [name, data] of Object.entries(doc.assets)) {
      files[`assets/${name}`] = data;
    }
  }

  return zipSync(files, { level: 6 });
}

/**
 * Deserializa bytes de un archivo .sdoc a SdocDocument.
 */
export function deserialize(data: Uint8Array): SdocDocument {
  const files = unzipSync(data);

  const contentRaw = files["content.json"];
  const metadataRaw = files["metadata.json"];

  if (!contentRaw || !metadataRaw) {
    throw new Error("Archivo .sdoc inválido: faltan content.json o metadata.json");
  }

  const content = JSON.parse(strFromU8(contentRaw));
  const metadata: SdocMetadata = JSON.parse(strFromU8(metadataRaw));

  const crdtState = files["crdt.bin"];

  const assets: Record<string, Uint8Array> = {};
  for (const [path, fileData] of Object.entries(files)) {
    if (path.startsWith("assets/")) {
      assets[path.replace("assets/", "")] = fileData;
    }
  }

  return {
    metadata,
    content,
    crdtState,
    assets: Object.keys(assets).length > 0 ? assets : undefined,
  };
}

/**
 * Crea metadatos vacíos para un nuevo documento.
 */
export function createMetadata(
  params: Pick<SdocMetadata, "id" | "title" | "language" | "ownerId"> &
    Partial<SdocMetadata>
): SdocMetadata {
  const now = new Date().toISOString();
  return {
    version: 1,
    tags: [],
    createdAt: now,
    updatedAt: now,
    sdocVersion: "1.0",
    ...params,
  };
}

/**
 * Documento ProseMirror vacío compatible con TipTap.
 */
export const EMPTY_DOCUMENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;
