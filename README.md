<div align="center">

<img src="apps/web/public/logo.svg" alt="Folio" width="80" height="80" />

# Folio

### Documentos que se sienten escritos a mano.

Editor de documentos colaborativo, offline-first y diseñado para mentes creativas.<br/>
Hecho en Colombia, listo para el mundo.

[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B.svg?style=for-the-badge)](LICENSE)
[![Made in Colombia](https://img.shields.io/badge/Made_in-Colombia-0F172A?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/stack-React_+_Spring_+_Yjs-0F172A?style=for-the-badge)](#stack)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-16A34A?style=for-the-badge)](CONTRIBUTING.md)

[**Documentación**](docs/) · [**Roadmap**](#roadmap) · [**Reportar bug**](../../issues/new/choose)

</div>

---

> ## 🤖 ¿Eres una IA / asistente de código?
>
> **Antes de tocar una sola línea, lee en este orden:**
>
> 1. [`AGENTS.md`](AGENTS.md) — contrato no negociable para IA.
> 2. [`SPEC.md`](SPEC.md) — única fuente de verdad (7700+ líneas).
> 3. [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) — estado actual del código vs. spec.
> 4. [`docs/FORMAT_SPEC_INDEX.md`](docs/FORMAT_SPEC_INDEX.md) — índice rápido del formato `.sdoc`.
> 5. [`docs/AI_TASK_PROTOCOL.md`](docs/AI_TASK_PROTOCOL.md) — protocolo de cambios.
>
> **No improvises. No asumas. Pregunta cuando dudes. Sin menciones a IA en código ni commits.**

---

## Por qué Folio

| | |
|---|---|
| **Colaboración real-time** | Edición simultánea sin conflictos con Yjs CRDT. Funciona incluso con redes inestables. |
| **Offline-first** | Sigue escribiendo sin internet. Folio sincroniza automáticamente al reconectar. |
| **Exporta como pro** | PDF, DOCX, HTML y EPUB con plantillas pensadas para informes, tesis y publicaciones. |
| **Seguridad bancaria** | AES-256-GCM en reposo, JWT en tránsito, OPA para permisos granulares. GDPR + Habeas Data. |
| **Pensado para Colombia** | Precios en COP, IVA discriminado, validación cédula/NIT, facturación electrónica DIAN-ready. |
| **Listo para el mundo** | i18n en español, inglés y portugués. Multi-moneda. Diseño accesible WCAG AA. |

---

## Empezar en 30 segundos

### Opción 1 — Solo frontend (modo demo, sin backend)

```bash
git clone https://github.com/metatech-programmer/folio.git
cd folio
npm install --workspaces --include-workspace-root
npm run dev -w apps/web
```

Abre [http://localhost:3000](http://localhost:3000). Folio detecta que no hay backend y activa **modo demo** con 6 documentos seed. Cero configuración.

### Opción 2 — Stack mínimo con Docker (3 contenedores)

```bash
docker compose -f docker-compose.demo.yml up -d
```

Web + Postgres + Redis arriba en ~60 segundos.

### Opción 3 — Plataforma completa (microservicios)

Ver [GETTING-STARTED.md](GETTING-STARTED.md) para el stack completo con 8 microservicios + Kafka + Keycloak.

---

## Desplegar gratis

Folio se despliega en pocos minutos con planes gratuitos:

- **Vercel** (frontend) — un comando, dominio HTTPS automático
- **Render** (API) — free tier con auto-deploy desde Git
- **Neon** (Postgres) — 0.5 GB gratis, sin tarjeta
- **Upstash** (Redis) — 10 K comandos/día gratis

```bash
vercel --prod
```

Guía completa en [DEPLOY.md](DEPLOY.md).

---

## Stack

<table>
<tr>
<th align="left">Frontend</th>
<th align="left">Backend</th>
<th align="left">Datos</th>
<th align="left">Infraestructura</th>
</tr>
<tr>
<td valign="top">

- React 18 · TypeScript
- Vite 5 · PWA
- TipTap (ProseMirror)
- Yjs CRDT colaboración
- Zustand · TanStack Query
- IndexedDB offline

</td>
<td valign="top">

- Spring Boot 3.3 (Java 21)
- Spring Cloud Gateway
- 8 microservicios + Python render
- FastAPI · Celery
- WeasyPrint (PDF)
- Keycloak (SSO)

</td>
<td valign="top">

- PostgreSQL 16
- Redis 7.2
- Kafka 3.7 (Avro)
- MinIO / S3
- Vault (secretos)

</td>
<td valign="top">

- Docker · Kubernetes
- Helm + ArgoCD
- OpenTelemetry · Jaeger
- Grafana · Prometheus
- KEDA (autoscaling)

</td>
</tr>
</table>

Arquitectura completa en [docs/architecture.md](docs/architecture.md).

---

## Capturas

Las capturas viven en `docs/screenshots/`. Para generarlas localmente:

```bash
npm run dev -w apps/web
# Abre http://localhost:3000 y captura las vistas que quieras compartir.
```

---

## Roadmap

- [x] Editor colaborativo Yjs
- [x] Exportación PDF / DOCX / HTML
- [x] i18n (ES-CO, EN, PT-BR)
- [x] Localización Colombia (COP, IVA, cédula/NIT)
- [x] PWA · Offline-first
- [x] Dark mode
- [ ] Plantillas (tesis, propuesta, contrato)
- [ ] App móvil React Native
- [ ] Marketplace de plantillas

---

## Contribuir

¡Toda contribución es bienvenida! Lee [CONTRIBUTING.md](CONTRIBUTING.md) para empezar.

Cosas en las que se puede ayudar:

- Traducir Folio a otros idiomas
- Crear plantillas
- Mejorar la documentación
- Reportar bugs
- Proponer features

---

## Licencia

[MIT](LICENSE) — usa Folio para lo que quieras, comercial o personal.

---

## Autor

Creado y mantenido por **Santiago Aguilar** — [@metatech-programmer](https://github.com/metatech-programmer).

Hecho con cariño en Medellín, Colombia.

---

<div align="center">

Construido sobre los hombros de gigantes: [TipTap](https://tiptap.dev) · [Yjs](https://yjs.dev) · [Spring](https://spring.io) · [React](https://react.dev) · [Vite](https://vitejs.dev).

**Si Folio te resulta útil, dale ⭐ al repo.**

</div>
