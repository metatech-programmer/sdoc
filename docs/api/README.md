# OpenAPI specs

Especificaciones OpenAPI 3.1 de los servicios HTTP de SDOC.

## Disponibles

| Servicio | Archivo | Endpoints destacados |
|---|---|---|
| **document-service** | [`document-service.openapi.yaml`](document-service.openapi.yaml) | CRUD documentos + `GET /download.sdoc` + `POST /import.sdoc` |

## Cómo usar estos specs

### Visualizar en Swagger UI

```bash
# Opción 1: editor online
# Pega el YAML en https://editor.swagger.io/

# Opción 2: local con npx
npx @redocly/cli preview-docs docs/api/document-service.openapi.yaml
# Abre http://localhost:8080
```

### Generar cliente HTTP

```bash
# TypeScript
npx openapi-typescript docs/api/document-service.openapi.yaml -o client.d.ts

# Python
pip install openapi-python-client
openapi-python-client generate --path docs/api/document-service.openapi.yaml

# Java
# Usa openapi-generator-cli https://openapi-generator.tech/
```

### Validar el spec

```bash
npx @redocly/cli lint docs/api/document-service.openapi.yaml
```

## Auto-generación desde el código (runtime)

Cuando el servicio está corriendo, Springdoc expone automáticamente:

- `http://localhost:8082/v3/api-docs` — JSON del spec live
- `http://localhost:8082/swagger-ui.html` — UI interactiva

Los archivos en este directorio son la versión **curada manualmente**
(con descripciones extendidas, ejemplos, links a SPEC.md). Se actualizan
cuando se agrega un endpoint público nuevo. La fuente de verdad sigue
siendo el código Java (anotaciones `@Operation`/`@Tag` de Springdoc).

## Servicios pendientes de spec curado

Los siguientes servicios todavía no tienen OpenAPI curado en este
directorio. Mientras tanto, consulta `/v3/api-docs` en runtime:

- `auth-service` (puerto 8081)
- `asset-service` (puerto 8083)
- `version-service` (puerto 8084)
- `notification-service` (puerto 8087)
- `render-service` (Python FastAPI, puerto 8086) — auto-genera spec en `/docs`

Para `sync-service` no aplica OpenAPI (es WebSocket Yjs).
