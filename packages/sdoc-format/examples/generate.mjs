#!/usr/bin/env node
/**
 * Genera 3 archivos .sdoc reales en este directorio:
 *
 *  - simple.sdoc    → un documento mínimo, sin firma ni cifrado.
 *  - signed.sdoc    → firmado con Ed25519 (incluye signature.json).
 *  - encrypted.sdoc → cifrado con AES-256-GCM + HKDF (password: "demo-1234").
 *
 * Estos archivos son LEGÍTIMOS: pasan `sdoc validate` y pueden abrirse con
 * cualquier herramienta compatible con la spec.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createSdoc,
  serializeSdoc,
  signSdoc,
  encryptSdoc,
  ed25519,
  aesGcm,
  userId as newUserId,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));

// Generamos un userId fijo válido (ULID determinístico) para reproducibilidad
const DEMO_USER_ID = newUserId();

// ============================================================
// 1. simple.sdoc
// ============================================================

const simple = await createSdoc({
  title: "Mi primer documento .sdoc",
  description: "Un documento de ejemplo para demostrar el formato.",
  owner: { id: DEMO_USER_ID, email: "demo@sdoc.local", name: "Demo User" },
  language: "es-CO",
  tags: ["demo", "ejemplo"],
  initialDocument: {
    type: "document",
    version: "1.0",
    pages: [
      {
        id: "page_001",
        order: 1,
        size: { width: 794, height: 1123, unit: "px" },
        margins: { top: 72, right: 72, bottom: 72, left: 72 },
        elements: [
          {
            id: "e001",
            type: "heading",
            attrs: { level: 1 },
            children: [{ type: "text", content: "Bienvenido a SDOC" }],
          },
          {
            id: "e002",
            type: "paragraph",
            children: [
              { type: "text", content: "Este es un archivo " },
              { type: "text", content: ".sdoc", marks: ["code"] },
              { type: "text", content: " real, generado con la librería oficial." },
            ],
          },
          {
            id: "e003",
            type: "paragraph",
            children: [
              {
                type: "text",
                content:
                  "Un .sdoc es un contenedor ZIP+JSON que incluye contenido, metadatos, historial, permisos, firma y assets — todo en un solo archivo portable.",
              },
            ],
          },
          {
            id: "e004",
            type: "codeblock",
            language: "bash",
            content: "npx @sdoc/format validate simple.sdoc",
          },
        ],
      },
    ],
  },
});

const simpleBytes = await serializeSdoc(simple);
writeFileSync(resolve(here, "simple.sdoc"), simpleBytes);
console.log(`OK simple.sdoc       ${simpleBytes.byteLength} bytes`);

// ============================================================
// 2. signed.sdoc
// ============================================================

const signKeyPair = await ed25519.generateKeyPair();
const signedBase = await createSdoc({
  title: "Documento firmado con Ed25519",
  description: "Demuestra la firma criptográfica.",
  owner: { id: DEMO_USER_ID },
  language: "es-CO",
  initialDocument: {
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
            children: [{ type: "text", content: "Documento firmado" }],
          },
          {
            id: "e002",
            type: "paragraph",
            children: [
              {
                type: "text",
                content:
                  "Este documento incluye una firma Ed25519 que garantiza autoría e integridad. Cualquier alteración invalidará la firma.",
              },
            ],
          },
        ],
      },
    ],
  },
});
const signed = await signSdoc({
  file: signedBase,
  privateKey: signKeyPair.privateKey,
  publicKey: signKeyPair.publicKey,
  signedBy: { userId: DEMO_USER_ID },
});
const signedBytes = await serializeSdoc(signed);
writeFileSync(resolve(here, "signed.sdoc"), signedBytes);
console.log(`OK signed.sdoc       ${signedBytes.byteLength} bytes  (signedBy=DEMO_USER_ID)`);
console.log(`   publicKey:  ${signKeyPair.publicKey}`);

// ============================================================
// 3. encrypted.sdoc
// ============================================================

const encryptedBase = await createSdoc({
  title: "Documento cifrado AES-256-GCM",
  description: "Solo se puede leer con la contraseña correcta.",
  owner: { id: DEMO_USER_ID },
  language: "es-CO",
  initialDocument: {
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
            children: [{ type: "text", content: "Contenido confidencial" }],
          },
          {
            id: "e002",
            type: "paragraph",
            children: [
              {
                type: "text",
                content:
                  "Si puedes leer esto, descifraste el archivo correctamente. La contraseña es 'demo-1234'.",
              },
            ],
          },
        ],
      },
    ],
  },
});

// Derivamos la masterKey desde la contraseña con PBKDF2
const PASSWORD = "demo-1234";
const passwordSalt = new Uint8Array(16);
crypto.getRandomValues(passwordSalt);
const masterKey = await aesGcm.deriveMasterKeyFromPassword(PASSWORD, passwordSalt);

const { bytes: encBytes } = await encryptSdoc({ file: encryptedBase, masterKey });
writeFileSync(resolve(here, "encrypted.sdoc"), encBytes);
console.log(`OK encrypted.sdoc    ${encBytes.byteLength} bytes  (password=demo-1234)`);
console.log(`   passwordSalt (base64): ${Buffer.from(passwordSalt).toString("base64")}`);
console.log("");
console.log("Listo. Pruébalos con:");
console.log("  node ../dist/cli/index.js info simple.sdoc");
console.log("  node ../dist/cli/index.js validate simple.sdoc");
console.log("  node ../dist/cli/index.js verify signed.sdoc");
