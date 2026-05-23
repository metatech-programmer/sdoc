/**
 * Servicio de persistencia offline usando IndexedDB vía idb.
 * Guarda borradores de documentos cuando no hay conexión.
 */
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "sdoc-offline";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_PENDING_OPS = "pending-ops";

interface Draft {
  documentId: string;
  content: unknown;
  savedAt: number;
}

interface PendingOp {
  id: string;
  documentId: string;
  content: unknown;
  timestamp: number;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "documentId" });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING_OPS)) {
        db.createObjectStore(STORE_PENDING_OPS, { keyPath: "id" });
      }
    },
  });
}

export async function saveDraft(documentId: string, content: unknown): Promise<void> {
  const db = await getDb();
  await db.put(STORE_DRAFTS, {
    documentId,
    content,
    savedAt: Date.now(),
  } satisfies Draft);
}

export async function loadDraft(documentId: string): Promise<Draft | undefined> {
  const db = await getDb();
  return db.get(STORE_DRAFTS, documentId);
}

export async function deleteDraft(documentId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_DRAFTS, documentId);
}

export async function getAllDrafts(): Promise<Draft[]> {
  const db = await getDb();
  return db.getAll(STORE_DRAFTS);
}

export async function savePendingOp(op: Omit<PendingOp, "id">): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.add(STORE_PENDING_OPS, { ...op, id } satisfies PendingOp);
  return id;
}

export async function getAllPendingOps(): Promise<PendingOp[]> {
  const db = await getDb();
  return db.getAll(STORE_PENDING_OPS);
}

export async function deletePendingOp(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PENDING_OPS, id);
}
