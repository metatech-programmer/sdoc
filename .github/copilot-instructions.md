# Copilot Instructions — SDOC Platform

These instructions apply to GitHub Copilot, Copilot Chat, Copilot
Workspace, and any agent operating in this repository.

## ALWAYS READ FIRST

1. `AGENTS.md` — non-negotiable AI contract (root of repo).
2. `SPEC.md` — single source of truth, ~7700 lines (root of repo).
3. `docs/PROJECT_OVERVIEW.md` — current state vs. spec.
4. `docs/FORMAT_SPEC_INDEX.md` — index to the .sdoc format spec.
5. `docs/AI_TASK_PROTOCOL.md` — the change protocol.

## Project Identity

SDOC is a new **open file format** (`.sdoc`), not an editor. The
platform (8 Java microservices + 1 Python service + React frontend) is
the reference implementation. The format is the product.

## Hard Constraints

- Tech stack is locked (see `SPEC.md` §2): Java 21, Spring Boot 3.3.x,
  Spring Cloud 2023.0.x, Kafka 3.7+, PostgreSQL 16, Redis 7.2,
  Keycloak 24+, Vault 1.16+, Python 3.12+, FastAPI 0.111+, React 18.3+,
  Vite 5+, Yjs 13+, TipTap 2+. Don't change these without permission.
- Monorepo structure is locked (see `SPEC.md` §4). Don't create new
  top-level folders or move services.
- Naming is fixed: services named per `SPEC.md` §4; Java packages
  `app.sdoc.<service>`; Kafka topics `sdoc.<domain>.<action>`.
- No marketing files inside the repo. No AI mentions anywhere.
- Security per `SPEC.md` §9: AES-256-GCM + HKDF-SHA256 for encryption,
  Ed25519 for signatures, Vault for secrets, mTLS between services.

## Code Style

- Java: follow Spring Boot conventions, Lombok where appropriate,
  MapStruct for DTO mapping. Use the patterns from `SPEC.md` §7.
- Python: FastAPI + Celery + async SQLAlchemy. Type hints required.
- TypeScript: strict mode, no `any`. React 18 + hooks. Zustand for
  state, TanStack Query for server state.
- CSS: CSS Modules. No utility frameworks beyond Tailwind if already
  in use.

## Tests

- Java: JUnit 5 + AssertJ + Testcontainers (Postgres, Kafka, Redis).
- Python: pytest + pytest-asyncio + httpx.
- TypeScript: Vitest.
- Coverage threshold: as per `SPEC.md` §19.

## Commits

Conventional Commits, in English or Spanish (consistent with the
repo's recent history; currently Spanish). No emojis. No AI mentions.
No `Co-Authored-By: Copilot` or similar.

## When unsure: STOP and ASK.

Read `AGENTS.md` for the complete contract.
