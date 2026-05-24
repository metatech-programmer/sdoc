# PROJECT_OVERVIEW.md — Estado Real del Proyecto

> Este documento describe lo que **existe hoy en el repo** y cómo se compara
> con lo que pide `SPEC.md`. Si encuentras divergencias mientras trabajas,
> **dilo al humano**; no las "arregles" silenciosamente.

---

## 1. Identidad del Proyecto (Recordatorio)

**SDOC** es un nuevo formato de archivo abierto (`.sdoc`), no una app.

- El **formato** es el producto.
- Las **librerías** (TS) que leen/escriben `.sdoc` son la primera capa.
- El **editor de referencia** (React + TipTap + Yjs) demuestra el formato.
- Los **microservicios** (Java + Python) habilitan cloud, colaboración y exports.

Spec completa: ver `SPEC.md`.

---

## 2. Mapa del Repositorio (Estado Actual)

```
sdoc-platform/
│
├── AGENTS.md                 ← Contrato para IA (LEER PRIMERO)
├── CLAUDE.md                 ← Alias del contrato
├── SPEC.md                   ← Spec maestra (7700+ líneas)
├── README.md                 ← Para humanos
├── GETTING-STARTED.md        ← Cómo levantar el stack
├── DEPLOY.md                 ← Cómo desplegar
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE                   ← MIT
├── .cursorrules              ← Reglas para Cursor IDE
│
├── .github/
│   ├── copilot-instructions.md   ← Reglas para GitHub Copilot
│   ├── workflows/                ← CI/CD
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── FUNDING.yml
│   └── dependabot.yml
│
├── infrastructure/
│   ├── docker/                   ← docker-compose.yml + scripts
│   ├── k8s/                      ← Manifiestos Kubernetes
│   ├── vault/                    ← Config Vault
│   ├── keycloak/                 ← Realm export
│   ├── kafka/                    ← topics.sh
│   └── opa/                      ← Políticas
│
├── services/                     ← 10 servicios (Java + Python)
│   ├── api-gateway/              ← Spring Cloud Gateway
│   ├── auth-service/             ← Keycloak + JWT
│   ├── document-service/         ← CRUD + Outbox + CQRS
│   ├── sync-service/             ← WebSocket + Yjs CRDT
│   ├── asset-service/            ← MinIO
│   ├── version-service/          ← Snapshots
│   ├── notification-service/     ← Kafka → email
│   ├── render-service/           ← Python: PDF/DOCX/HTML/EPUB
│   ├── config-server/            ← Spring Cloud Config
│   └── eureka-server/            ← Service Discovery
│
├── config-repo/                  ← Configs centralizadas (Git-backed)
│   ├── application.yml
│   └── <service>.yml             ← Uno por microservicio
│
├── packages/
│   └── sdoc-format/              ← TS lib del formato (EN PROGRESO)
│
├── apps/
│   └── web/                      ← React 18 + Vite (editor referencia)
│
├── shared/
│   ├── java-commons/             ← DTOs Java compartidos
│   ├── ts-types/                 ← Tipos TS compartidos
│   └── avro-schemas/             ← Schemas Avro para Kafka
│
├── scripts/
│   ├── verify.sh                 ← Verificación pre-deploy
│   └── verify.ps1                ← Idem (PowerShell)
│
├── docs/
│   ├── PROJECT_OVERVIEW.md       ← Este archivo
│   ├── FORMAT_SPEC_INDEX.md      ← Índice de la spec del formato
│   ├── AI_TASK_PROTOCOL.md       ← Protocolo para IA al modificar
│   ├── adr/                      ← Architecture Decision Records
│   ├── api/                      ← OpenAPI exports
│   └── runbooks/
│
├── docker-compose.demo.yml       ← Stack mínimo (web + postgres + redis)
├── vercel.json · netlify.toml · render.yaml · railway.toml · fly.toml
├── settings.gradle.kts · build.gradle.kts
├── turbo.json · package.json
└── .env.example
```

### Comparación rápida con `SPEC.md` §4

| Esperado por spec | Estado actual |
|---|---|
| `services/` con 10 servicios | ✅ Existen los 10 |
| `config-repo/` con un yml por servicio | ✅ Existe |
| `packages/sdoc-format` | ⚠️ Existe pero **incompleto** (no implementa la spec del formato real aún) |
| `packages/sdoc-editor` | ❌ No existe |
| `packages/sdoc-viewer` | ❌ No existe |
| `packages/sdoc-sdk` | ❌ No existe |
| `apps/web` | ✅ Existe |
| `apps/desktop` (Tauri, Fase 4) | ❌ No existe (correcto, es fase futura) |
| `shared/java-commons` | ✅ Existe |
| `shared/ts-types` | ✅ Existe |
| `shared/avro-schemas` | ✅ Existe |
| `infrastructure/k8s` | ✅ Existe |
| `infrastructure/vault` | ✅ Existe |
| `infrastructure/keycloak` | ✅ Existe |
| `infrastructure/opa` | ✅ Existe |

---

## 3. Estado por Componente

### Microservicios Java

| Servicio | Estado | Notas |
|---|---|---|
| `config-server` | ✅ Implementado | Spring Cloud Config |
| `eureka-server` | ✅ Implementado | Service Discovery |
| `api-gateway` | ✅ Implementado | Con filtros JWT, rate limit, idempotency |
| `auth-service` | ✅ Implementado | Keycloak + GDPR + StorageLimits |
| `document-service` | ✅ Implementado | CRUD + CQRS + Outbox + OPA + AES-256-GCM |
| `sync-service` | ✅ Implementado | WebSocket + Yjs |
| `asset-service` | ✅ Implementado | MinIO |
| `version-service` | ✅ Implementado | Snapshots + restore via Kafka |
| `notification-service` | ✅ Implementado | Resend + DLQ |

### Servicio Python

| Servicio | Estado |
|---|---|
| `render-service` (FastAPI + Celery + WeasyPrint) | ✅ Implementado con DLQ manual |

### Frontend (`apps/web`)

| Pieza | Estado |
|---|---|
| Auth (login/register) con validaciones | ✅ Existe |
| Dashboard con grid + search + filtros + skeletons | ✅ Existe |
| Editor TipTap + Yjs + modo zen + autosave indicator | ✅ Existe |
| AppShell + theme switcher (light/dark/system) + i18n switcher | ✅ Existe |
| PWA + offline + IndexedDB | ✅ Existe |
| Checkout UI (PSE, Nequi, Daviplata, Bancolombia, Card, Stripe) | ⚠️ UI mock — fase 4 del roadmap, sin integración real con Wompi/Stripe |
| Landing | ⚠️ Existe pero copywriting está alineado con "formato" — revisar narrativa periódicamente |
| Demo mode (fallback sin backend) | ✅ Útil para dev, activa con `VITE_DEMO_MODE=true` o cuando API no responde |
| Branding | ✅ "SDOC" en toda la app. El logo, OG image, manifest, i18n locales, package name (`@sdoc/web`) usan la marca oficial. |

### Formato `.sdoc` y librerías TS

| Pieza | Estado | Crítico |
|---|---|---|
| `SPEC.md` §6 (especificación del formato) | ✅ Documentada en spec | — |
| JSON Schemas (manifest, document, acl, signature, encryption-meta) | ✅ 5 schemas v1 en `packages/sdoc-format/src/schemas/` | — |
| `packages/sdoc-format` (lib TS read/write/validate) | ✅ Implementado, 37/37 tests pasan, build ESM+CJS+DTS | — |
| Crypto: Ed25519 firma + AES-256-GCM + HKDF-SHA256 + PBKDF2 | ✅ Implementado con Web Crypto API nativa | — |
| CLI `sdoc` (init/info/validate/extract/pack/sign/verify/keygen) | ✅ Implementado, bin publicado | — |
| Archivos `.sdoc` de ejemplo (simple, signed, encrypted) | ✅ 3 ejemplos en `packages/sdoc-format/examples/` | — |
| `packages/sdoc-editor` (editor embebible standalone) | ❌ No existe (el editor de `apps/web` cumple por ahora) | Bajo |
| `packages/sdoc-viewer` (viewer embebible) | ❌ No existe | Bajo |
| `packages/sdoc-sdk` (SDK público con API REST) | ❌ No existe | Bajo (fase futura) |
| Validador online (sitio web) | ❌ No existe | Bajo |

### Infraestructura

| Pieza | Estado |
|---|---|
| Docker Compose dev (`infrastructure/docker/docker-compose.yml`) | ✅ Existe (23 servicios) |
| Docker Compose demo (`docker-compose.demo.yml`) | ✅ Agregado (3 contenedores) |
| Vault init scripts | ✅ Existe |
| Kafka topics script | ✅ Existe |
| Keycloak realm export | ✅ Existe |
| OPA policies (documents.rego, limits.rego) | ✅ Existe |
| K8s manifests + Helm chart | ✅ Existe (Fase 5) |
| ArgoCD configuration | ✅ Existe |

### Observabilidad

| Pieza | Estado |
|---|---|
| Prometheus | ✅ |
| Grafana | ✅ |
| Loki + Promtail | ✅ |
| Jaeger (OpenTelemetry) | ✅ |
| Alertmanager | ✅ |

### CI/CD

| Pieza | Estado |
|---|---|
| `.github/workflows/ci.yml` | ✅ |
| `.github/workflows/cd-staging.yml` | ✅ |
| `.github/workflows/cd-production.yml` | ✅ |
| `.github/workflows/security-scan.yml` | ✅ |
| `.github/workflows/deploy-vercel.yml` | ✅ (agregado) |
| Dependabot | ✅ |

---

## 4. Gaps Críticos vs. `SPEC.md`

Estos son los gaps reales que separan el estado actual de la visión completa:

### GAP 1 — ~~Implementación del formato `.sdoc`~~ RESUELTO

`packages/sdoc-format` está implementado al 100% según SPEC.md §6 y §9.3:

- 5 JSON Schemas (manifest, document, acl, signature, encryption-meta).
- Lib TypeScript con `createSdoc`, `parseSdoc`, `serializeSdoc`, `validateSdocFile`.
- Crypto completa: Ed25519 (sign/verify/keygen), AES-256-GCM + HKDF-SHA256
  (encrypt/decrypt), PBKDF2 (password → masterKey).
- Canonicalización JSON (RFC 8785-lite) para checksums reproducibles.
- CLI `sdoc` (init, info, validate, extract, pack, sign, verify, keygen).
- 3 archivos `.sdoc` de ejemplo en `examples/` (simple, signed, encrypted).
- 37/37 tests Vitest pasan.
- Build: ESM + CJS + DTS, listo para publicar en npm.

El proyecto YA entrega su promesa central: existe un formato `.sdoc` real,
abierto, firmable y cifrable, con implementación de referencia funcional.

### GAP 2 — ~~Editor importa/exporta `.sdoc`~~ RESUELTO

`apps/web/src/services/sdoc-file.ts` integra `@sdoc/format` con:

- `openSdocFromDisk()` — file picker → parsea y devuelve `SdocFile`.
- `downloadSdoc(file)` — serializa y dispara descarga del navegador.
- `tiptapToSdocDocument()` / `sdocDocumentToTiptap()` — conversiones bidireccionales.
- `buildSdocFromEditor()` — helper de alto nivel.

El menú "Exportar" del editor ahora ofrece `.sdoc` (nativo, formato propio)
además de PDF/DOCX/HTML, y un comando "Abrir .sdoc…" para importar.

### GAP 3 — ~~Rebrand "Folio" no autorizado por spec~~ RESUELTO

Hubo durante un tiempo un rebrand visual a "Folio" que contradecía la spec.
**Decisión final:** revertir todo a "SDOC". Hoy el repo, package name,
landing, i18n, OG image, manifest, logo wordmark y meta tags usan
**únicamente "SDOC"** como marca, alineado con `SPEC.md`.

El repo público está en `github.com/metatech-programmer/sdoc`.

Si en el futuro se decide separar marca del formato (ej: "X editor para
.sdoc"), debe hacerse **por decisión explícita del humano** y reflejarse
primero en `SPEC.md`.

### GAP 4 — Checkout / pagos UI agregada sin estar en fase actual

**Spec:** §20 (Monetización) y Fase 4 del roadmap (Semanas 14–20).

**Realidad:** Ya hay UI mock de checkout (PSE, Nequi, Daviplata, Stripe).

**Implicación:** Adelantado a su fase. Sin integración real con Wompi/Stripe.
La spec define que vendrá en Fase 4 después de que microservicios core estén
estables. **No es bug, pero está fuera de orden.**

### GAP 5 — Landing comercial premium

**Spec:** No define explícitamente cómo es la landing.

**Realidad:** Hay landing con hero, features, pricing en COP, footer.

**Implicación:** No es contradictorio, pero el copywriting vende "editor",
no "formato". **Debería pivotar a vender el formato `.sdoc`.**

---

## 5. Próximos Pasos Sugeridos (al humano)

Con Gaps 1 y 2 resueltos, los siguientes pasos según prioridad:

1. **Publicar `@sdoc/format` en npm** para que terceros puedan usarlo
   (`npm publish` desde `packages/sdoc-format/`).
2. **Sitio público de la spec** (GitHub Pages): publicar `SPEC.md` + los
   JSON Schemas en una URL canónica tipo `https://sdoc.app/schemas/...`.
3. **Backend: que `document-service` exporte/importe `.sdoc` real** además
   del JSON actual. Endpoint `GET /documents/:id/download.sdoc`.
4. **Render service: que cuando se exporte a PDF/DOCX/HTML, también pueda
   exportar a `.sdoc` con firma del owner** (usa la clave Ed25519 de Vault).
5. **`packages/sdoc-viewer`**: viewer embebible read-only basado en
   `@sdoc/format` + tipografía/maquetación. Útil para mostrar `.sdoc`
   en blogs, emails, otros productos.
6. **Validar el flujo end-to-end manualmente:** crear documento en editor →
   exportar como `.sdoc` → cerrar pestaña → abrir el `.sdoc` desde disco
   → debe verse idéntico, con la firma del autor.
7. **Integración CRDT real:** que `serializeSdoc` incluya el `crdtState`
   binario de Yjs, y `parseSdoc` lo restaure al abrir.

Estos pasos están alineados con `SPEC.md` §6, §7.4 (render-service para
exports), §9.3 (crypto), y §21 (roadmap fase 3+).

Después de esto, retomar el roadmap original de la spec (Fases 4, 5).

---

## 6. Convenciones de Este Documento

- "✅" = implementado y alineado con la spec.
- "⚠️" = existe pero con desviaciones; revisar con humano.
- "❌" = no existe / no implementado.
- "Crítico" = bloquea la promesa central del proyecto.

Cuando este documento esté **desactualizado**, dilo al humano y propón un
update.

---

*Última revisión por IA: con SPEC.md v2.2.*
