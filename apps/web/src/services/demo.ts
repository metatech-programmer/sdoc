/**
 * Demo mode — datos seed locales para probar SDOC sin backend.
 * Se activa con VITE_DEMO_MODE=true o cuando el API responde >500ms.
 */
import type { Document, User } from "@sdoc/types";

export const DEMO_USER: User = {
  id: "demo-user-001",
  email: "demo@sdoc.local",
  fullName: "Camila Restrepo",
  plan: "PRO" as any,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() as any,
  storageUsedBytes: 234_000_000,
  storageLimitBytes: 21_474_836_480, // 20 GB
};

const now = Date.now();

export const DEMO_DOCS: Document[] = [
  {
    id: "doc-001",
    title: "Propuesta editorial Q2 2026",
    description: "Calendario editorial, tono de voz y métricas objetivo para el segundo trimestre.",
    ownerId: DEMO_USER.id,
    status: "DRAFT" as any,
    content: {},
    language: "es",
    wordCount: 1240,
    pageCount: 4,
    sizeBytes: 28_400,
    version: 7,
    isPublic: false,
    tags: ["estrategia", "Q2"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 12).toISOString() as any,
  },
  {
    id: "doc-002",
    title: "El arte de pensar despacio",
    description: "Ensayo personal sobre escritura contemplativa y herramientas que desaparecen.",
    ownerId: DEMO_USER.id,
    status: "PUBLISHED" as any,
    content: {},
    language: "es",
    wordCount: 3580,
    pageCount: 12,
    sizeBytes: 78_900,
    version: 14,
    isPublic: true,
    tags: ["ensayo", "personal"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 14).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString() as any,
  },
  {
    id: "doc-003",
    title: "Tesis · Capítulo 3 (borrador)",
    description: "Marco teórico — CRDT y consistencia eventual en sistemas colaborativos.",
    ownerId: DEMO_USER.id,
    status: "DRAFT" as any,
    content: {},
    language: "es",
    wordCount: 5210,
    pageCount: 18,
    sizeBytes: 124_500,
    version: 21,
    isPublic: false,
    tags: ["tesis", "investigación"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 60).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString() as any,
  },
  {
    id: "doc-004",
    title: "Notas reunión cliente · Bavaria",
    description: "Acta sin formalismos. Decisiones clave + tareas asignadas.",
    ownerId: DEMO_USER.id,
    status: "DRAFT" as any,
    content: {},
    language: "es",
    wordCount: 640,
    pageCount: 2,
    sizeBytes: 14_200,
    version: 3,
    isPublic: false,
    tags: ["cliente", "reunión"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString() as any,
  },
  {
    id: "doc-005",
    title: "Manual de marca — v2",
    description: "Identidad visual, tipografía, paleta. Lo que sí y lo que no.",
    ownerId: DEMO_USER.id,
    status: "PUBLISHED" as any,
    content: {},
    language: "es",
    wordCount: 2100,
    pageCount: 8,
    sizeBytes: 56_300,
    version: 9,
    isPublic: false,
    tags: ["marca", "diseño"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 45).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString() as any,
  },
  {
    id: "doc-006",
    title: "Receta abuela · Ajiaco santafereño",
    description: "Versión definitiva. Sin variaciones, sin atajos.",
    ownerId: DEMO_USER.id,
    status: "ARCHIVED" as any,
    content: {},
    language: "es",
    wordCount: 320,
    pageCount: 1,
    sizeBytes: 6_400,
    version: 2,
    isPublic: true,
    tags: ["personal", "cocina"],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 90).toISOString() as any,
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString() as any,
  },
];

export const isDemoMode = () =>
  import.meta.env.VITE_DEMO_MODE === "true" ||
  typeof window !== "undefined" &&
    window.localStorage.getItem("sdoc.demo") === "true";

/** Activa/desactiva demo mode persistente. */
export function setDemoMode(on: boolean) {
  if (on) window.localStorage.setItem("sdoc.demo", "true");
  else window.localStorage.removeItem("sdoc.demo");
}
