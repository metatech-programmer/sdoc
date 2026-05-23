# SDOC Platform — Guía de Arranque

Esta guía cubre todo lo que necesitas para levantar la plataforma SDOC localmente desde cero.

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| **Docker Desktop** | 4.30+ | Asignar **≥ 8 GB RAM** en Settings → Resources → Memory |
| **Java JDK** | 21 ó 25 | Gradle 8.14.2 soporta ambos — no habrá error de compatibilidad |
| **Node.js** | 20 LTS | Solo para desarrollo frontend local |
| **jq** | cualquiera | Para los comandos curl de prueba |

> **IDE:** Abre `sdoc-platform/` directamente en IntelliJ o VS Code.  
> IntelliJ detecta `settings.gradle.kts` automáticamente.

---

## Paso 1 — Copiar variables de entorno

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

Los valores por defecto de `.env.example` son suficientes para desarrollo local.

---

## Paso 2 — Levantar el stack completo

```bash
cd infrastructure/docker
docker compose up -d
```

La primera vez descarga ~6–8 GB de imágenes. Espera **3–5 minutos**.

### Verificar que todos los servicios están sanos

```bash
docker compose ps
```

Todos deben mostrar `(healthy)`. Orden de arranque:

1. PostgreSQL, Redis, Zookeeper → ~30 s
2. Kafka, MinIO → ~60 s
3. Keycloak (importa el realm `sdoc`) → ~90 s
4. Vault → ~30 s
5. Config Server + Eureka → ~60 s
6. Los 8 microservicios Java + render-service → ~120 s

---

## Paso 3 — Inicializar Vault *(una sola vez)*

```bash
docker exec sdoc-vault sh /vault-init.sh
```

Crea los secretos iniciales (contraseñas, claves AES-256) en Vault.  
Solo necesitas ejecutarlo la **primera vez** o si borras los volúmenes.

---

## Paso 4 — Crear los topics de Kafka *(una sola vez)*

```bash
bash infrastructure/kafka/topics.sh
```

Crea los 9 topics + 3 DLQs.

---

## Paso 5 — Abrir el frontend

Ve a **http://localhost:3000**, regístrate y empieza a usar la plataforma.

---

## URLs de todos los servicios

| URL | Servicio | Credenciales |
|---|---|---|
| **http://localhost:3000** | Frontend React | Regístrate como usuario nuevo |
| http://localhost:8080 | API Gateway | — |
| http://localhost:8090 | **Keycloak** admin | `admin` / `admin` |
| http://localhost:8761 | Eureka Dashboard | — |
| http://localhost:8888 | Config Server | — |
| http://localhost:8089 | **Kafka UI** | — |
| http://localhost:8092 | **Schema Registry UI** | — |
| http://localhost:9001 | **MinIO Console** | `minioadmin` / `minioadmin` |
| http://localhost:3001 | **Grafana** | `admin` / `admin` |
| http://localhost:16686 | **Jaeger** (trazas) | — |
| http://localhost:9090 | Prometheus | — |
| http://localhost:9093 | Alertmanager | — |
| http://localhost:5555 | **Flower** (Celery) | — |
| http://localhost:4242 | **Unleash** (feature flags) | `admin` / `admin-secret` |
| http://localhost:8200 | **Vault** UI | Token: `root-token` |

---

## Flujo de prueba end-to-end

### 1. Registrar usuario

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sdoc.app","password":"Test1234!","fullName":"Test User"}' | jq .
```

### 2. Iniciar sesión y obtener token

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sdoc.app","password":"Test1234!"}' | jq -r '.accessToken')

echo "Token: ${TOKEN:0:60}..."
```

### 3. Crear un documento

```bash
DOC_ID=$(curl -s -X POST http://localhost:8080/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi primer documento","language":"ES","syncEnabled":true}' | jq -r '.id')

echo "Documento creado: $DOC_ID"
```

Verifica el evento en **Kafka UI** → topic `sdoc.documents.created`.

### 4. Exportar a PDF

```bash
curl -s -X POST http://localhost:8080/api/v1/render/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"documentId\": \"$DOC_ID\",
    \"documentTitle\": \"Mi primer documento\",
    \"format\": \"PDF\",
    \"contentJson\": {\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hola SDOC\"}]}]},
    \"language\": \"es\"
  }" | jq .
```

El export es asíncrono. El resultado llega al topic `sdoc.exports.completed` y dispara un email.

### 5. Ver historial de versiones y restaurar

```bash
# Listar versiones
curl -s http://localhost:8080/api/v1/documents/$DOC_ID/versions \
  -H "Authorization: Bearer $TOKEN" | jq .

# Restaurar a versión 1
curl -s -X POST http://localhost:8080/api/v1/documents/$DOC_ID/versions/1/restore \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 6. Importar un DOCX

```bash
curl -s -X POST http://localhost:8086/api/v1/render/imports/docx \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/al/archivo.docx" | jq .
```

### 7. Colaboración en tiempo real

Abre **http://localhost:3000** en dos pestañas o dos navegadores distintos.  
Inicia sesión, abre el mismo documento — verás la sincronización CRDT Yjs en tiempo real con cursores colaborativos.

### 8. GDPR — Exportar tus datos

```bash
curl -s http://localhost:8080/api/v1/auth/me/export \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 9. GDPR — Eliminar cuenta

```bash
curl -s -X DELETE http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Responde 204 No Content
```

---

## Desarrollo local (servicios Java sin Docker)

### Compilar el monorepo

```bash
./gradlew build -x test
```

### Ejecutar tests unitarios

```bash
./gradlew test
./gradlew :services:document-service:test
./gradlew :services:auth-service:test
```

### Tests de integración (CI)

```bash
# Levantar servicios mínimos
docker compose -f infrastructure/docker/docker-compose.test.yml up -d

# Correr tests con perfil de integración
./gradlew test -Dspring.profiles.active=test

# Parar
docker compose -f infrastructure/docker/docker-compose.test.yml down
```

### Frontend React

```bash
npm install
npm run dev -w apps/web       # Hot-reload en http://localhost:3000
npm run build -w apps/web     # Build de producción
```

### Render service (Python)

```bash
cd services/render-service

pip install -r requirements.txt
pip install -r requirements-dev.txt

# FastAPI (modo dev)
uvicorn app.main:app --reload --port 8086

# Worker Celery (otra terminal)
celery -A app.worker worker --loglevel=info -Q exports,previews

# Tests
pytest tests/ -v --cov=app
```

---

## Solución de problemas

### "Port already in use"

```powershell
netstat -ano | findstr :8080
```

Puertos usados: 3000, 3001, 4242, 5555, 8080–8092, 8200, 8761, 8888, 9001, 9090, 9093, 16686.

### Los microservicios Java no arrancan

```bash
docker compose logs config-server --tail 50
docker compose logs eureka-server --tail 50
```

Config Server y Eureka deben estar `(healthy)` antes que los demás servicios.

### Keycloak no importa el realm

```bash
docker compose logs keycloak --tail 100 | grep -i "error\|realm"
docker compose restart keycloak
```

### Reiniciar desde cero (borra todos los datos)

```bash
cd infrastructure/docker
docker compose down -v
docker compose up -d
# Repetir: vault-init.sh y topics.sh
```

---

## Arquitectura resumida

```
Browser (React 18 + Yjs CRDT + IndexedDB offline)
        │
        ▼
  API Gateway :8080
  (JWT · Rate Limit · Idempotency · Correlation ID · Circuit Breaker)
        │
        ├── Auth Service :8081       (Keycloak · JWT · GDPR · StorageLimits)
        ├── Document Service :8082   (CQRS · OPA · AES-256-GCM · Outbox)
        ├── Asset Service :8083      (MinIO · Presigned URLs)
        ├── Version Service :8084    (Snapshots · Restore · MinIO)
        ├── Sync Service :8085       (WebSocket · Yjs CRDT · Redis)
        ├── Render Service :8086     (FastAPI · Celery · WeasyPrint · PDF/DOCX/HTML)
        └── Notification :8087       (Kafka · Resend Email · DLQ)

Infraestructura:
  PostgreSQL 16  ← Flyway · JSONB · FTS · Materialized Views
  Redis 7.2      ← Cache · CRDT state · Celery broker · Idempotency
  Kafka 3.7      ← 9 topics + 3 DLQs · Schema Registry · Avro
  MinIO          ← 4 buckets: documents, assets, versions, exports
  Keycloak 24    ← SSO · realm sdoc
  Vault 1.16     ← Secretos en runtime
  OPA            ← Políticas de autorización por documento
  Unleash        ← Feature flags → http://localhost:4242
```
