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
| JSON Schemas (`manifest.v1.json`, `document.v1.json`, etc.) | ❌ No existen | **SÍ** |
| `packages/sdoc-format` (lib TS read/write/validate) | ❌ Vacío / sin implementar | **SÍ** |
| `packages/sdoc-editor` (editor embebible) | ❌ No existe | Medio |
| `packages/sdoc-viewer` (viewer embebible) | ❌ No existe | Medio |
| `packages/sdoc-sdk` (SDK público) | ❌ No existe | Bajo (fase futura) |
| CLI `sdoc` (validate/info/pack/extract) | ❌ No existe | Medio |
| Validador online | ❌ No existe | Bajo |
| Archivos `.sdoc` de ejemplo | ❌ No existen | **SÍ** |

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

### GAP 1 — Implementación del formato `.sdoc` (CRÍTICO)

**Spec:** §6 define el formato como ZIP con manifest.json, content/, assets/,
revisions/, sync/, permissions/, security/, preview/.

**Realidad:** No existe una librería que lea/escriba archivos `.sdoc` reales.
El "documento" hoy es un objeto JSON en PostgreSQL servido por
`document-service`. El **archivo `.sdoc`** como tal **no se materializa nunca**.

**Implicación:** El proyecto **todavía no entrega su promesa principal**. Es
una plataforma SaaS, no un nuevo formato de archivo.

**Trabajo pendiente:**
- JSON Schemas (`schemas/manifest.v1.json`, etc.) en `packages/sdoc-format/schemas/`.
- Implementación TypeScript de:
  - `parseSdoc(buffer): SdocDocument` — descomprime ZIP, valida manifest,
    devuelve estructura.
  - `serializeSdoc(doc): Blob` — empaqueta a ZIP `.sdoc`.
  - `validate(doc): ValidationResult` — verifica contra JSON Schema.
  - `sign(doc, privateKey): SignedSdoc` — Ed25519.
  - `verify(doc, publicKey): boolean` — verifica firma.
  - `encrypt(doc, password): EncryptedSdoc` — AES-256-GCM + HKDF-SHA256.
  - `decrypt(doc, password): SdocDocument`.
- CLI `sdoc` (Node) con comandos: `validate`, `info`, `pack`, `extract`, `sign`.
- Archivos `.sdoc` de ejemplo en `packages/sdoc-format/examples/`.

### GAP 2 — Editor importa/exporta `.sdoc`

**Spec:** El editor debe poder abrir un `.sdoc` desde disco y guardarlo de vuelta.

**Realidad:** El editor hoy solo lee/escribe contra el API REST. No maneja
archivos locales.

**Trabajo pendiente:** integrar `packages/sdoc-format` en `apps/web` con
acciones "Abrir .sdoc", "Descargar como .sdoc".

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

Orden recomendado según `SPEC.md`:

1. **Implementar `packages/sdoc-format`** completo (Gap 1, prioridad #1).
   Hasta que esto exista, el proyecto no cumple su promesa central de "ser
   un nuevo formato de archivo". Incluye JSON Schemas, lib TS
   read/write/validate, crypto (Ed25519 + AES-256-GCM + HKDF-SHA256).
2. **Crear archivos `.sdoc` de ejemplo** en `packages/sdoc-format/examples/`
   y subirlos al repo.
3. **CLI `sdoc`** (Node) con comandos `validate`, `info`, `pack`, `extract`,
   `sign`.
4. **Conectar editor con el formato** (Gap 2): integrar
   `packages/sdoc-format` en `apps/web` con acciones "Abrir .sdoc" y
   "Descargar como .sdoc".
5. **Crear sitio público de la spec** (puede ser `apps/spec-site` o publicar
   `SPEC.md` en GitHub Pages).
6. **Validar el flujo end-to-end:** crear documento en editor → exportar como
   `.sdoc` → cerrar → reabrir desde disco → debe verse igual.

Estos pasos están alineados con `SPEC.md` §6, §7.4 (render-service para
exports), §9.5–9.6 (crypto), y §21 (roadmap).

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
