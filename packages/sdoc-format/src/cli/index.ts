#!/usr/bin/env node
/**
 * CLI `sdoc` — herramientas de línea de comandos para el formato .sdoc.
 *
 * Comandos:
 *   sdoc init <file.sdoc> [--title "..."]   crea un .sdoc vacío
 *   sdoc info <file.sdoc>                   muestra metadatos
 *   sdoc validate <file.sdoc>               valida estructura, schemas y checksums
 *   sdoc extract <file.sdoc> <outDir>       descomprime el ZIP en un directorio
 *   sdoc pack <dir> <out.sdoc>              empaqueta un directorio en .sdoc
 *   sdoc sign <file.sdoc> --priv <key> --pub <key> --user <id>
 *                                           firma con Ed25519
 *   sdoc verify <file.sdoc>                 verifica la firma embebida
 *   sdoc keygen                             genera un par Ed25519 nuevo
 *
 * Sin dependencias externas más allá de Node fs/path (Web Crypto nativo).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createSdoc,
  parseSdoc,
  serializeSdoc,
  signSdoc,
  validateSdocFile,
  verifySdocSignature,
  ed25519,
} from "../index.js";
import type { SdocFile } from "../types.js";

const VERSION = "1.0.0";

async function main() {
  const [, , cmd, ...args] = process.argv;

  try {
    switch (cmd) {
      case undefined:
      case "-h":
      case "--help":
      case "help":
        printHelp();
        return;
      case "-v":
      case "--version":
      case "version":
        console.log(VERSION);
        return;
      case "init":
        await cmdInit(args);
        return;
      case "info":
        await cmdInfo(args);
        return;
      case "validate":
        await cmdValidate(args);
        return;
      case "extract":
        await cmdExtract(args);
        return;
      case "pack":
        await cmdPack(args);
        return;
      case "sign":
        await cmdSign(args);
        return;
      case "verify":
        await cmdVerify(args);
        return;
      case "keygen":
        await cmdKeygen(args);
        return;
      default:
        console.error(`Comando desconocido: ${cmd}`);
        printHelp();
        process.exit(1);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`error: ${msg}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`sdoc — CLI del formato .sdoc (v${VERSION})

Uso:
  sdoc init <file.sdoc> [--title "Mi doc"] [--owner usr_...]
  sdoc info <file.sdoc>
  sdoc validate <file.sdoc>
  sdoc extract <file.sdoc> <outDir>
  sdoc pack <dir> <out.sdoc>
  sdoc sign <file.sdoc> --priv <base64> --pub <base64> --user <id>
  sdoc verify <file.sdoc>
  sdoc keygen
  sdoc version
`);
}

// ============================================================
// Comandos
// ============================================================

async function cmdInit(args: string[]) {
  const file = args[0];
  if (!file) throw new Error("falta <file.sdoc>");
  const title = readFlag(args, "--title") ?? "Documento sin título";
  const ownerId = readFlag(args, "--owner") ?? "usr_00000000000000000000000000";

  const sdoc = await createSdoc({
    title,
    owner: { id: ownerId },
  });
  const bytes = await serializeSdoc(sdoc);
  await fs.writeFile(file, bytes);
  console.log(`OK creado ${file} (${bytes.byteLength} bytes, id=${sdoc.manifest.id})`);
}

async function cmdInfo(args: string[]) {
  const file = args[0];
  if (!file) throw new Error("falta <file.sdoc>");
  const bytes = await fs.readFile(file);
  const sdoc = await parseSdoc(new Uint8Array(bytes), { validate: false });
  const m = sdoc.manifest;
  console.log(`SDOC ${file}
  id            ${m.id}
  title         ${m.title}
  formatVersion ${m.formatVersion}
  schemaVersion ${m.schemaVersion}
  version       ${m.version}
  owner         ${m.owner.id}${m.owner.email ? " <" + m.owner.email + ">" : ""}
  createdAt     ${m.createdAt}
  updatedAt     ${m.updatedAt}
  pages         ${sdoc.document.pages.length}
  language      ${m.meta.language ?? "-"}
  encrypted     ${m.security.encryptedContent}
  signed        ${sdoc.signature ? "yes (by " + sdoc.signature.signedBy.userId + ")" : "no"}
  assets        ${sdoc.assets ? Object.keys(sdoc.assets).length : 0}
  contentSha    ${m.security.contentChecksum}
  manifestSha   ${m.security.manifestChecksum}`);
}

async function cmdValidate(args: string[]) {
  const file = args[0];
  if (!file) throw new Error("falta <file.sdoc>");
  const bytes = await fs.readFile(file);
  const sdoc = await parseSdoc(new Uint8Array(bytes), { validate: false });
  const result = await validateSdocFile(sdoc);
  if (result.valid) {
    console.log(`OK ${file} es un .sdoc válido`);
    if (sdoc.signature) {
      const sig = await verifySdocSignature(sdoc);
      if (sig.valid) console.log(`OK firma Ed25519 válida`);
      else console.log(`FAIL firma inválida: ${sig.reason}`);
    }
  } else {
    console.error(`FAIL ${file} tiene ${result.errors.length} errores:`);
    for (const e of result.errors) {
      console.error(`  - [${e.file}] ${e.path}: ${e.message} (${e.code})`);
    }
    process.exit(1);
  }
}

async function cmdExtract(args: string[]) {
  const [file, outDir] = args;
  if (!file || !outDir) throw new Error("uso: sdoc extract <file.sdoc> <outDir>");
  const { strFromU8, unzipSync } = await import("fflate");
  const bytes = await fs.readFile(file);
  const entries = unzipSync(new Uint8Array(bytes));
  await fs.mkdir(outDir, { recursive: true });
  for (const [p, b] of Object.entries(entries)) {
    const full = path.join(outDir, p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (p.endsWith(".json") || p.endsWith(".html")) {
      await fs.writeFile(full, strFromU8(b), "utf8");
    } else {
      await fs.writeFile(full, b);
    }
  }
  console.log(`OK extraído ${Object.keys(entries).length} entradas en ${outDir}`);
}

async function cmdPack(args: string[]) {
  const [dir, out] = args;
  if (!dir || !out) throw new Error("uso: sdoc pack <dir> <out.sdoc>");
  const { zipSync, strToU8 } = await import("fflate");

  async function walk(base: string, prefix = ""): Promise<Record<string, Uint8Array>> {
    const acc: Record<string, Uint8Array> = {};
    const entries = await fs.readdir(base, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(base, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        Object.assign(acc, await walk(full, rel));
      } else {
        const buf = await fs.readFile(full);
        // JSON canonicalizable: lo reempaquetamos como string (no rompemos bytes binarios).
        if (full.endsWith(".json")) {
          acc[rel] = strToU8(buf.toString("utf8"));
        } else if (full.endsWith(".html")) {
          acc[rel] = strToU8(buf.toString("utf8"));
        } else {
          acc[rel] = new Uint8Array(buf);
        }
      }
    }
    return acc;
  }

  const entries = await walk(dir);
  const bytes = zipSync(entries, { level: 6 });
  await fs.writeFile(out, bytes);
  console.log(`OK empaquetado ${Object.keys(entries).length} entradas en ${out} (${bytes.byteLength} bytes)`);
}

async function cmdSign(args: string[]) {
  const file = args[0];
  if (!file) throw new Error("falta <file.sdoc>");
  const priv = readFlag(args, "--priv");
  const pub = readFlag(args, "--pub");
  const user = readFlag(args, "--user");
  if (!priv || !pub || !user) {
    throw new Error("se requieren --priv <base64> --pub <base64> --user <userId>");
  }
  const bytes = await fs.readFile(file);
  const sdoc = await parseSdoc(new Uint8Array(bytes), { validate: false });
  const signed = await signSdoc({
    file: sdoc,
    privateKey: priv,
    publicKey: pub,
    signedBy: { userId: user },
  });
  const out = await serializeSdoc(signed);
  await fs.writeFile(file, out);
  console.log(`OK firmado ${file} (signedBy=${user}, hash=${signed.signature?.signedHash})`);
}

async function cmdVerify(args: string[]) {
  const file = args[0];
  if (!file) throw new Error("falta <file.sdoc>");
  const bytes = await fs.readFile(file);
  const sdoc = await parseSdoc(new Uint8Array(bytes), { validate: false });
  if (!sdoc.signature) {
    console.error("FAIL el archivo no tiene firma");
    process.exit(1);
  }
  const res = await verifySdocSignature(sdoc);
  if (res.valid) {
    console.log(`OK firma válida (signedBy=${sdoc.signature.signedBy.userId})`);
  } else {
    console.error(`FAIL firma inválida: ${res.reason}`);
    process.exit(1);
  }
}

async function cmdKeygen(_args: string[]) {
  const pair = await ed25519.generateKeyPair();
  console.log(`Ed25519 keypair generado.

  publicKey  (compártela):   ${pair.publicKey}
  privateKey (GUARDALA SEGURA, NUNCA LA COMPARTAS):
${pair.privateKey}

Uso:
  sdoc sign doc.sdoc --priv "${pair.privateKey}" --pub "${pair.publicKey}" --user usr_...`);
}

// ============================================================
// Helpers
// ============================================================

function readFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

main();
