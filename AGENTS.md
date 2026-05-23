# AGENTS.md — Contrato Obligatorio para Cualquier IA que Toque este Repositorio

> **Este documento se aplica a cualquier modelo de IA, asistente, copiloto o agente
> autónomo (Claude Code, GitHub Copilot, Cursor, Codex, Gemini Code Assist,
> Aider, etc.) que lea, modifique, refactorice, audite o genere código en este
> repositorio.**
>
> **Es un contrato no negociable.** Si no puedes cumplir alguna sección de
> este archivo, detente y pregunta al humano. **No improvises. No asumas. No
> tomes caminos alternativos. No cambies la meta.**

---

## 0. Lo Primero que DEBES Hacer Antes de Tocar Nada

**Antes de tu primera tool call que escriba, edite, mueva o ejecute algo:**

1. **Lee `SPEC.md` COMPLETO**. Son 7.700+ líneas. Es la única fuente de verdad.
   No es opcional. No es "background". Es **prerequisito**.
2. **Lee `docs/PROJECT_OVERVIEW.md`** para entender el estado actual del repo
   vs. la spec.
3. **Lee `docs/FORMAT_SPEC_INDEX.md`** para localizar rápidamente cada parte
   de la spec por tema.
4. **Lee `docs/AI_TASK_PROTOCOL.md`** para conocer el protocolo de cambios.
5. Si el usuario te pidió algo concreto, **relee la sección de `SPEC.md` que
   corresponda** antes de planificar.

Si saltas este paso, **vas a romper el proyecto**. Ya pasó antes.

---

## 1. Qué es SDOC (la verdad, no asunciones)

**SDOC NO es "otro editor de documentos colaborativo".**
**SDOC NO es "otra alternativa a Notion".**
**SDOC NO es solo una app SaaS.**

**SDOC es:**

1. **Un nuevo FORMATO de archivo abierto: `.sdoc`**
   Es la pieza central. Es lo que se vende. Es lo que diferencia.
   Es a `.pdf` lo que `.pdf` fue a `.ps` en 1993.

2. **Una especificación pública** del formato (ZIP + JSON con estructura
   estricta — ver `SPEC.md` §6).

3. **Una plataforma de referencia** (8 microservicios Java + 1 Python +
   frontend React) que demuestra el formato vivo: editar, sincronizar,
   versionar, firmar, cifrar, exportar.

4. **Un ecosistema open-source** alrededor del formato: librerías
   (`packages/sdoc-format`, `packages/sdoc-editor`, `packages/sdoc-viewer`,
   `packages/sdoc-sdk`), CLI, validador.

### La jerarquía de importancia

```
1. FORMATO .sdoc (la spec)          ← Lo más importante. Nunca lo olvides.
2. Librerías que leen/escriben .sdoc ← Lo que da vida al formato.
3. Editor de referencia              ← Demuestra el formato.
4. Microservicios backend            ← Habilitan colaboración y cloud.
5. Branding, marketing, landing      ← Lo último. Sirve al formato, no al revés.
```

**Si una tarea entra en conflicto con la spec del formato, la spec gana.
Siempre. Sin excepción.**

---

## 2. Qué Hay Dentro de `SPEC.md` (Mapa Obligatorio)

`SPEC.md` cubre 22 secciones principales + 18 componentes adicionales (A-R).
Esta tabla es tu **índice de emergencia** — antes de tocar algo, identifica la
sección que aplica y léela íntegra.

| § | Sección | Cuándo leerla obligatoriamente |
|---|---|---|
| 1 | Visión y Diferencial | Antes de cualquier tarea de marketing, landing, naming, copywriting |
| 2 | Stack Tecnológico Definitivo | Antes de cambiar versiones, agregar/quitar deps |
| 3 | Arquitectura Enterprise — Vista Global | Antes de modificar cómo los servicios se comunican |
| 4 | Estructura del Monorepo | Antes de crear/mover/renombrar carpetas o archivos top-level |
| 5 | Spring Cloud Infrastructure (Config, Eureka, Gateway, Resilience4j) | Antes de tocar gateway, descubrimiento, circuit breakers |
| **6** | **Especificación Formato .sdoc** | **SIEMPRE que toques algo relacionado con el formato, lectura, escritura, validación, manifest, document.json, assets, revisions, sync, permissions, security, preview** |
| 7 | Microservicios — Diseño Completo (auth, document, sync, render, asset, version, notification) | Antes de tocar cualquier servicio Java o Python |
| 8 | Comunicación entre Servicios (Feign, Kafka, Saga) | Antes de agregar/modificar llamadas inter-servicios o topics Kafka |
| 9 | Seguridad Enterprise (Vault, mTLS, Keycloak, OPA, AES-256-GCM+HKDF, Ed25519) | Antes de tocar autenticación, autorización, cifrado, firmas |
| 10 | Infraestructura Docker Compose | Antes de modificar docker-compose, servicios infra |
| 11 | Base de Datos y Esquemas | Antes de cambiar schemas, migraciones, queries |
| 15 | Observabilidad (Prometheus, Grafana, Loki, Jaeger) | Antes de tocar logging, métricas, tracing |
| 16 | CI/CD Pipeline | Antes de tocar `.github/workflows/` |
| 19 | Testing Strategy | Antes de escribir o modificar tests |
| 20 | Monetización SaaS | Antes de tocar pagos, planes, facturación, Stripe |
| 21 | Roadmap por Fases | Para saber qué fase estás haciendo |
| 22 | Checklist de Producción Enterprise | Antes de declarar algo "listo para producción" |

### Componentes adicionales (A–R)

| Letra | Componente | Tema |
|---|---|---|
| A | Outbox Pattern | Consistencia DB ↔ Kafka |
| B | CQRS | Separación lectura/escritura |
| C | Schema Registry + Avro | Contratos de eventos versionados |
| D | Feature Flags (Unleash) | Activación gradual |
| E | API Versioning | Estrategia de versiones públicas |
| F | Multitenancy | Aislamiento por organización |
| G | Kubernetes Completo | Producción real |
| H | External Secrets Operator | Vault → K8s |
| I | Structured Logging (JSON Logback) | Logs |
| J | GitOps con ArgoCD | Despliegue declarativo |
| K | GDPR y Compliance | Borrado real de datos |
| L | Virtual Threads (Java 21) | Performance |
| M | Health Check Avanzado | Readiness granular |
| N | Backup Strategy | Backups automatizados |
| O | Spring Cloud Stream | Abstracción Kafka |
| P | Spring Security | Config por servicio |
| Q | Flyway | Migraciones por servicio |
| R | OpenAPI / Swagger | Documentación APIs |

---

## 3. Las 12 Reglas Inviolables

### Regla 1 — El formato es el rey
Toda decisión debe servir al formato `.sdoc`. Si algo lo debilita,
diluye, o lo hace propietario, **no lo hagas**.

### Regla 2 — `SPEC.md` es la única fuente de verdad
Si `SPEC.md` dice una cosa y el código dice otra, **`SPEC.md` gana**. Tu
trabajo es alinear el código a la spec, **no al revés**. Si crees que la
spec debe cambiar, **proponlo al humano**. No la cambies tú.

### Regla 3 — Cero asunciones, máximo verificar
Si no estás seguro de algo, **lee `SPEC.md`**. Si no está ahí, **pregunta
al humano**. Nunca asumas que sabes lo que el proyecto necesita.

### Regla 4 — Stack inmutable sin autorización explícita
El stack está en `SPEC.md` §2. **No cambies versiones mayores. No
sustituyas librerías. No agregues frameworks nuevos.** Si necesitas algo
no listado, pregunta primero.

### Regla 5 — Estructura del monorepo es ley
`SPEC.md` §4 define la estructura exacta. **No crees carpetas top-level
nuevas. No muevas servicios. No renombres paquetes.** Si la estructura
actual no coincide con la spec, el código debe migrar a la spec, no la
spec al código.

### Regla 6 — Naming respeta la spec
Servicios se llaman `auth-service`, `document-service`, `sync-service`,
`asset-service`, `version-service`, `notification-service`,
`render-service`, `api-gateway`, `config-server`, `eureka-server`.
Paquetes Java: `app.sdoc.<servicio>`. Topics Kafka: `sdoc.<dominio>.<acción>`.
**No inventes otros nombres.**

### Regla 7 — Cada cambio backend que afecte un evento debe respetar Schema Registry
Si tocas un evento Kafka (`UserRegisteredEvent`, `DocumentCreatedEvent`,
etc.), respeta versiones Avro. Cambios breaking requieren nueva versión
del esquema. Ver `SPEC.md` §Componente C.

### Regla 8 — Outbox para eventos críticos
Toda escritura a la DB que dispare un evento Kafka **debe usar Outbox
Pattern** (`SPEC.md` §Componente A). Nunca `kafkaTemplate.send()` directo
fuera de la transacción de DB.

### Regla 9 — Seguridad no es negociable
- Cifrado: AES-256-GCM + HKDF-SHA256
- Firmas: Ed25519
- mTLS entre servicios
- Secretos en Vault, **nunca en `.env`** en producción
- JWT validation en Gateway
- OPA para autorización

Si modificas algo de seguridad, lee `SPEC.md` §9 completo. Sin excepciones.

### Regla 10 — Tests obligatorios al tocar lógica de negocio
Cualquier cambio a `service/`, `domain/`, `kafka/` o `client/` debe tener
test. `SPEC.md` §19 define la estrategia. Testcontainers para integración,
JUnit 5 + AssertJ para unidad.

### Regla 11 — Frontend: lee la spec del frontend
`SPEC.md` §14 (Frontend) define el stack: React 18, TypeScript 5.4,
Vite 5, Zustand, TanStack Query, Yjs, TipTap, Radix UI, Tailwind.
**No agregues** Material UI, Chakra, Mantine, ShadCN sin permiso. **No
sustituyas** Vite por Webpack/Next.js sin permiso.

### Regla 12 — Cuando termines, vuelve a SPEC.md
Después de terminar una tarea, **vuelve a `SPEC.md`** para verificar que
tu cambio sigue alineado con el resto del sistema. Si encontraste un
conflicto, **díselo al humano**.

---

## 4. Lo que ESTÁ Prohibido Hacer (Lista Cerrada)

Está prohibido sin permiso explícito del humano y por escrito:

❌ **Cambiar la marca o el branding** de la plataforma. El nombre interno
es "SDOC Platform". Cualquier renombre (a "Folio", "Doc", "X", etc.)
debe partir del humano.

❌ **Crear archivos de marketing/PR** dentro del repo (LinkedIn posts,
Product Hunt drafts, press kits, scripts de video, plantillas de email,
guías de lanzamiento). Si los necesitas, crea una carpeta `_personal/` o
`_release/` **fuera del repo**, nunca dentro.

❌ **Mencionar al asistente de IA** en código, comentarios, commits,
PRs, READMEs, docstrings, o cualquier archivo del repo. No "Generated
with Claude", no "Co-Authored-By: Claude", no "AI-assisted", nada.

❌ **Cambiar versiones del stack** sin antes leer §2 de `SPEC.md` y
proponer el cambio al humano.

❌ **Crear nuevas carpetas top-level** (`/release`, `/marketing`,
`/notes`, `/personal`, `/scratch`, etc.).

❌ **Reemplazar librerías core** (TipTap por Slate, Yjs por Automerge,
Spring Cloud por algo más, PostgreSQL por MySQL, Kafka por RabbitMQ).

❌ **Decir "está listo para producción"** sin haber pasado el §22
checklist.

❌ **Agregar funcionalidades fuera del roadmap** sin permiso. Si ves
un gap, dilo al humano, no lo implementes solo.

❌ **Modificar `SPEC.md`** sin que el humano lo pida explícitamente.

❌ **Force-pushear a main** sin permiso explícito. Nunca.

❌ **Crear commits con `--no-verify`** o saltarse hooks. Nunca.

❌ **Subir secretos** (`.env`, claves, tokens, passwords) al repo.
Verifica antes de cada `git add`.

❌ **Trabajar en demo mode permanente** si la spec exige funcionalidad
real. Demo mode es para que un humano pruebe el frontend sin levantar
todo el stack; no es el modo de producción.

---

## 5. Lo que SÍ Debes Hacer Siempre

✅ **Lee la sección de `SPEC.md` que aplica** antes de cada tarea no trivial.

✅ **Pregunta cuando dudes.** Una pregunta clarificadora vale más que
500 líneas de código mal dirigido.

✅ **Reporta gaps entre código actual y `SPEC.md`** al humano.
**No los arregles silenciosamente** — el humano debe decidir.

✅ **Mantén la estructura de carpetas según §4** de la spec.

✅ **Sigue los patrones de cada microservicio** (`config/`, `controller/`,
`service/`, `repository/`, `domain/`, `client/`, `kafka/`, `exception/`).

✅ **Usa los topics Kafka exactos** definidos en §8.2 de la spec.

✅ **Respeta los puertos** del Apéndice A de la spec.

✅ **Documenta decisiones técnicas no obvias** en `docs/adr/`
(Architecture Decision Records).

✅ **Antes de declarar `feat: …` listo**, verifica:
- ¿Está alineado con `SPEC.md`?
- ¿Tiene tests?
- ¿La estructura es la que dice §4?
- ¿No introduje deps fuera de §2?
- ¿Respeté nombres de §3 y §8?

✅ **Mensajes de commit:** Conventional Commits, en inglés o español
consistente con el resto del repo. Cortos en el subject, descriptivos
en el body. **Sin emojis. Sin Co-Authored-By. Sin "Generated with…".**

✅ **PRs:** describe qué cambia, por qué, qué sección de `SPEC.md`
aplica, cómo probar.

---

## 6. Protocolo para Cada Tarea

Detallado en `docs/AI_TASK_PROTOCOL.md`. Resumen:

```
1. ENTENDER
   - ¿Qué pide el humano exactamente?
   - ¿Qué sección de SPEC.md aplica?
   - Si no está claro, PREGUNTA antes de tocar nada.

2. PLANIFICAR
   - Lista los archivos a tocar.
   - Identifica los riesgos (seguridad, breaking changes, perf).
   - Propón el plan al humano si la tarea es no trivial (>3 archivos
     o toca seguridad/eventos/schema).

3. IMPLEMENTAR
   - Cambios mínimos suficientes.
   - Sin refactors no pedidos.
   - Sin "mientras estoy aquí, también arreglo…".
   - Sigue convenciones del archivo que editas (indentación, naming).

4. VERIFICAR
   - Compila el código (npm run build, ./gradlew build, etc.).
   - Corre los tests relevantes.
   - Si tocaste frontend, levanta el dev server y verifica que carga
     sin errores en consola.
   - Si tocaste backend, verifica el actuator/health.

5. REPORTAR
   - Qué cambiaste y por qué.
   - Qué archivos tocaste (paths exactos).
   - Qué tests pasaron.
   - Qué dejaste pendiente (si algo).
   - Si encontraste algo raro en SPEC.md o en el código, dilo.
```

---

## 7. Cómo Manejar Conflictos entre Spec y Realidad

Es probable que encuentres situaciones donde:

- El código actual no coincide con `SPEC.md`.
- Una librería listada en §2 no funciona como se esperaba.
- Una decisión en `SPEC.md` parece contradecir otra.
- El humano te pide algo que contradice `SPEC.md`.

**En todos los casos: PARA y reporta al humano.**

Plantilla de reporte:

```
He encontrado un conflicto entre [SPEC.md §X] y [estado actual / lo
pedido]:

- Spec dice: [cita exacta]
- Realidad / lo pedido: [descripción]

Veo tres opciones:
1. [opción A]
2. [opción B]
3. [opción C]

¿Cuál sigo? ¿O hay otra opción que no estoy viendo?
```

**Nunca decidas tú.** Eso fue lo que rompió el proyecto antes.

---

## 8. Idioma

- Mensajes al humano: **español** (Colombia neutro).
- Identificadores en código: **inglés** (servicios, clases, funciones,
  variables, archivos).
- Comentarios en código: el idioma que ya usa el archivo (la mayoría
  en español).
- Logs estructurados: claves en inglés, mensajes en inglés.
- Commit messages: español o inglés, consistente con el repo (el repo
  ha venido usando español; mantén eso a menos que el humano pida
  cambiar).
- Documentación de usuario: español (es-CO) primario; en/pt-BR
  secundarios si la tarea es i18n.

---

## 9. Lecturas Mínimas por Tipo de Tarea

| Tipo de tarea | Lee obligatoriamente |
|---|---|
| Tocar el formato `.sdoc` | `SPEC.md` §6 completo |
| Tocar editor o viewer | `SPEC.md` §6, §14 |
| Tocar `auth-service` | `SPEC.md` §7.1, §9 |
| Tocar `document-service` | `SPEC.md` §7.2, §8, §Comp. A, §Comp. B |
| Tocar `sync-service` | `SPEC.md` §7.3, §12 (CRDT) |
| Tocar `render-service` | `SPEC.md` §7.4, §13 |
| Tocar `asset-service` | `SPEC.md` §7.5 |
| Tocar `version-service` | `SPEC.md` §7.6 |
| Tocar `notification-service` | `SPEC.md` §7.7 |
| Tocar `api-gateway` | `SPEC.md` §5.3, §9 |
| Tocar Kafka | `SPEC.md` §8.2, §Comp. C, §Comp. O |
| Tocar seguridad | `SPEC.md` §9 completo |
| Tocar K8s / Helm | `SPEC.md` §Comp. G, §Comp. H, §Comp. J |
| Tocar Vault | `SPEC.md` §9.1, §18 |
| Tocar tests | `SPEC.md` §19 |
| Tocar billing / Stripe | `SPEC.md` §20 |
| Tocar landing / marketing / branding | `SPEC.md` §1, y CONSULTA primero |
| Tocar i18n | `SPEC.md` §1 (usuarios objetivo), §14 |
| Crear nuevo microservicio | **STOP. Consulta primero.** §4, §7 |

---

## 10. Señales de Alerta — Cuando DEBES Parar

Detente y pregunta si:

- Vas a crear más de 5 archivos nuevos.
- Vas a tocar más de 10 archivos existentes.
- Vas a tocar seguridad, autenticación, cifrado o firmas.
- Vas a modificar un evento Kafka.
- Vas a cambiar el schema de la DB.
- Vas a tocar el formato `.sdoc` (manifest, document.json, etc.).
- Vas a tocar el gateway o cualquier filtro global.
- Vas a agregar una dependencia nueva.
- Vas a renombrar algo público (clase, endpoint, paquete).
- Vas a hacer `git push --force`, `git reset --hard`, `git rebase`, o
  cualquier operación destructiva.

---

## 11. Si Esta Es Tu Primera Vez en el Repo

Sigue este orden de lectura, **sin saltarte ninguno**:

1. Este archivo (`AGENTS.md`) — completo.
2. `SPEC.md` — completo (sí, los 7.700 renglones).
3. `docs/PROJECT_OVERVIEW.md` — estado actual del código vs. spec.
4. `docs/FORMAT_SPEC_INDEX.md` — índice del formato `.sdoc`.
5. `docs/AI_TASK_PROTOCOL.md` — cómo trabajar.
6. `README.md` — para usuarios finales del repo.
7. `GETTING-STARTED.md` — cómo levantar el stack.

Solo entonces, considera tocar código.

---

## 12. Recordatorio Final

Tu trabajo es **servir al proyecto, no al ego de ninguna IA**. El
proyecto tiene una visión clara documentada en `SPEC.md`. Tu valor es
ejecutarla con precisión, no reinterpretarla.

Si te equivocas, **dilo**. Es mejor un "no estoy seguro, ¿puedes
explicarme X?" que 500 líneas que el humano tiene que tirar.

Si encuentras un bug, **arréglalo bien**. Sin atajos. Sin "lo dejo así
por ahora". Sin TODOs futuros.

Si terminas, **verifica que el sistema sigue funcionando** antes de
declarar la tarea completa.

**Bienvenido al proyecto. Léelo todo. Después empieza.**
