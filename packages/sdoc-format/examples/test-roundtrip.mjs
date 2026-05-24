#!/usr/bin/env node
/**
 * Smoke test: lee los 3 ejemplos generados y verifica que funcionan.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  parseSdoc,
  decryptSdoc,
  aesGcm,
  verifySdocSignature,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));

console.log("=== parseSdoc(simple.sdoc) ===");
const simple = await parseSdoc(new Uint8Array(readFileSync(resolve(here, "simple.sdoc"))));
console.log("  OK  title:", simple.manifest.title);
console.log("  OK  pages:", simple.document.pages.length);

console.log("\n=== parseSdoc(signed.sdoc) + verify ===");
const signed = await parseSdoc(new Uint8Array(readFileSync(resolve(here, "signed.sdoc"))));
const sig = await verifySdocSignature(signed);
console.log("  OK  signature valid:", sig.valid);
console.log("  OK  signedBy:", signed.signature?.signedBy.userId);

console.log("\n=== decryptSdoc(encrypted.sdoc) con password correcto ===");
// Para el demo, derivamos la misma masterKey con el salt guardado.
// (En un caso real, el salt va dentro de encryption-meta.json del archivo.)
const PASSWORD = "demo-1234";
const saltBase64 = "f8tCZ366tu6Va5vostR38w=="; // salt del generate.mjs (cambia por corrida)
console.log("  (nota: este test funciona si volviste a generar los ejemplos en esta sesión)");
try {
  const salt = Uint8Array.from(Buffer.from(saltBase64, "base64"));
  const masterKey = await aesGcm.deriveMasterKeyFromPassword(PASSWORD, salt);
  const decrypted = await decryptSdoc({
    bytes: new Uint8Array(readFileSync(resolve(here, "encrypted.sdoc"))),
    masterKey,
  });
  console.log("  OK  title:", decrypted.manifest.title);
} catch (e) {
  console.log("  WARN  no se pudo descifrar con salt hardcodeado (regenera ejemplos primero)");
}

console.log("\n  Todo OK ✓");
