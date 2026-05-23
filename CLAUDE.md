# CLAUDE.md — Punto de Entrada Obligatorio

> Este archivo se carga automáticamente por Claude Code, Cursor y otras
> herramientas. Es un **alias del contrato principal** en `AGENTS.md`.

## ANTES DE HACER CUALQUIER COSA

**1. Lee `AGENTS.md` COMPLETO.** No es opcional. Define el contrato.

**2. Lee `SPEC.md` COMPLETO.** Son 7.700+ líneas. Es la única fuente de verdad
del proyecto. No es "background" — es **prerequisito**.

**3. Lee `docs/PROJECT_OVERVIEW.md`** para entender el estado actual del
código vs. la spec.

**4. Lee `docs/FORMAT_SPEC_INDEX.md`** para localizar rápido cada parte
de la spec del formato `.sdoc`.

**5. Lee `docs/AI_TASK_PROTOCOL.md`** para el protocolo de cambios.

Si saltas alguno, vas a romper el proyecto. **Ya pasó antes.**

---

## Resumen de un Vistazo

- **SDOC NO es un editor.** Es un **nuevo formato de archivo abierto: `.sdoc`**.
- La plataforma (8 microservicios + frontend) es **infraestructura de
  referencia** que demuestra el formato.
- Toda decisión debe servir al formato, no al revés.
- El stack tecnológico está fijo en `SPEC.md` §2 — **no lo cambies**.
- La estructura del monorepo está fija en `SPEC.md` §4 — **no la cambies**.

---

## Las 5 Reglas Más Importantes

1. **`SPEC.md` gana siempre.** Código contra spec → arregla el código.
2. **Cero asunciones.** Si dudas, lee la spec. Si no está, pregunta.
3. **Sin marketing dentro del repo.** Nada de LinkedIn, Press Kit,
   Product Hunt. Va fuera del repo, en `_personal/`.
4. **Sin menciones a IA.** Ni en código, commits, comentarios, ni nada.
   No `Co-Authored-By: Claude`. No "Generated with…". Nunca.
5. **Pregunta antes de cambios grandes** (>5 archivos nuevos, >10
   archivos tocados, seguridad, schemas, eventos Kafka, nuevas deps).

---

## El Resto Está en AGENTS.md

Cualquier sección de detalle, lista de prohibiciones, protocolo, índice
de la spec, lecturas mínimas por tipo de tarea, señales de alerta —
todo está en `AGENTS.md`. Léelo entero. Ahora.
