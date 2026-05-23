# SDOC PLATFORM — MASTER BUILD PROMPT v2.0
## Infraestructura Documental de Nueva Generación — Enterprise Grade
### De 0 a Producción Real · Spring Cloud · Kafka · Vault · mTLS · CRDTs

---

> **INSTRUCCIÓN CRÍTICA PARA LA IA QUE LEE ESTO:**
> Este documento es la única fuente de verdad del proyecto SDOC Platform.
> Antes de escribir cualquier línea de código, lee la sección completa correspondiente.
> Nunca improvises decisiones de arquitectura no documentadas aquí.
> Cuando termines una fase o un servicio, vuelve a este documento antes de continuar.
> El objetivo es producción real con estándares enterprise, no prototipos.

---

## ÍNDICE MAESTRO

1. [Visión y Diferencial](#1-visión-y-diferencial)
2. [Stack Tecnológico Definitivo](#2-stack-tecnológico-definitivo)
3. [Arquitectura Enterprise — Vista Global](#3-arquitectura-enterprise--vista-global)
4. [Estructura del Monorepo](#4-estructura-del-monorepo)
5. [Spring Cloud Infrastructure Layer](#5-spring-cloud-infrastructure-layer)
   - 5.1 Config Server
   - 5.2 Eureka Server (Service Discovery)
   - 5.3 Spring Cloud Gateway
   - 5.4 Resilience4j (Circuit Breaker, Bulkhead, Retry)
6. [Especificación Formato .sdoc](#6-especificación-formato-sdoc)
7. [Microservicios — Diseño Completo](#7-microservicios--diseño-completo)
   - 7.1 auth-service
   - 7.2 document-service
   - 7.3 sync-service
   - 7.4 render-service
   - 7.5 asset-service
   - 7.6 version-service
   - 7.7 notification-service
8. [Comunicación entre Servicios](#8-comunicación-entre-servicios)
   - 8.1 OpenFeign (síncrona)
   - 8.2 Kafka (asíncrona / event-driven)
   - 8.3 Saga Pattern
9. [Seguridad Enterprise](#9-seguridad-enterprise)
   - 9.1 HashiCorp Vault
   - 9.2 mTLS entre servicios
   - 9.3 Keycloak + OAuth2/OIDC
   - 9.4 OPA Policies
   - 9.5 Cifrado AES-256-GCM + HKDF
   - 9.6 Firmas Ed25519
10. [Infraestructura Docker Compose Completa](#10-infraestructura-docker-compose-completa)
11. [Base de Datos y Esquemas](#11-base-de-datos-y-esquemas)
12. [Motor de Sincronización CRDTs](#12-motor-de-sincronización-crdts)
13. [Motor de Renderizado](#13-motor-de-renderizado)
14. [Frontend Web — Arquitectura Completa](#14-frontend-web--arquitectura-completa)
15. [Observabilidad Enterprise](#15-observabilidad-enterprise)
16. [CI/CD Pipeline Completo](#16-cicd-pipeline-completo)
17. [Kubernetes — Producción](#17-kubernetes--producción)
18. [Variables de Entorno y Vault](#18-variables-de-entorno-y-vault)
19. [Testing Strategy](#19-testing-strategy)
20. [Monetización SaaS](#20-monetización-saas)
21. [Roadmap por Fases](#21-roadmap-por-fases)
22. [Checklist de Producción Enterprise](#22-checklist-de-producción-enterprise)

---

## 1. VISIÓN Y DIFERENCIAL

### Qué es SDOC Platform

**SDOC** es una plataforma de infraestructura documental sincronizable. El archivo `.sdoc` es un contenedor ZIP+JSON — internamente abierto, externamente poderoso.

### Diferencial Real vs Competencia

| Problema hoy | Solución SDOC |
|---|---|
| PDF estático, no colaborativo | `.sdoc` vivo: versiones, sync, colaboración |
| DOCX sin offline-first real | Offline total + sync automático con CRDTs |
| Notion/Google Docs sin exportación fiel | Exportación perfecta PDF/DOCX/HTML/EPUB |
| Formatos propietarios cerrados | ZIP+JSON: siempre legible, siempre portable |
| Sin assets dinámicos en documentos | Videos, 3D, dashboards embebidos |
| Seguridad básica en plataformas doc | AES-256-GCM + Ed25519 + mTLS + Vault |

### Usuarios Objetivo

- **Tier 1 MVP:** Profesionales independientes, investigadores, estudiantes postgrado
- **Tier 2:** Equipos 5–50 personas, startups, consultoras
- **Tier 3 Enterprise:** Corporaciones con compliance, auditoría, on-premise

---

## 2. STACK TECNOLÓGICO DEFINITIVO

> REGLA ABSOLUTA: Ninguna tecnología se cambia sin actualizar este documento y evaluar el impacto completo en la arquitectura.

### Backend — Servicios Java (Spring Ecosystem)

```
Java 21 (LTS, Virtual Threads habilitados)
Spring Boot 3.3.x
Spring Cloud 2023.0.x (BOM completo)
  ├── Spring Cloud Gateway 4.x          ← API Gateway reactivo
  ├── Spring Cloud Netflix Eureka        ← Service Discovery
  ├── Spring Cloud Config Server         ← Configuración centralizada
  ├── Spring Cloud OpenFeign             ← Clientes HTTP declarativos
  ├── Spring Cloud LoadBalancer          ← Load balancing client-side
  └── Spring Cloud Kubernetes            ← Integración K8s (producción)
Spring WebFlux (reactivo, Project Reactor)
Spring Security 6.x (OAuth2 Resource Server)
Spring Data JPA + Hibernate 6
Spring Data Redis (Lettuce client)
Spring Kafka (Apache Kafka integration)
Spring Actuator + Micrometer
Resilience4j 2.x (Circuit Breaker, Bulkhead, Retry, RateLimiter, TimeLimiter)
Flyway 10.x (migraciones de base de datos)
MapStruct 1.5+ (mapeo DTO ↔ Entity)
Lombok (reducción boilerplate)
Gradle 8+ con Kotlin DSL
OpenTelemetry Java Agent (distributed tracing)
```

### Infraestructura de Plataforma

```
Apache Kafka 3.7+              ← Event streaming / comunicación async
HashiCorp Vault 1.16+          ← Secrets management, cifrado como servicio
Keycloak 24+                   ← Identity Provider (OAuth2/OIDC)
Open Policy Agent (OPA) 0.65+  ← Autorización granular basada en políticas
Nginx 1.25+                    ← Reverse proxy, TLS termination
cert-manager                   ← Certificados TLS automáticos (K8s)
Istio (opcional, fase K8s)     ← Service mesh, mTLS automático
```

### Bases de Datos e Infraestructura de Datos

```
PostgreSQL 16                  ← Base de datos principal
Redis 7.2 Cluster              ← Caché, pub/sub, sesiones, Celery broker
Apache Kafka 3.7               ← Event bus entre microservicios
MinIO (dev) / Cloudflare R2 (prod) ← Object storage S3-compatible
Elasticsearch 8.x (Fase 2)    ← Full-text search avanzado
```

### Backend — Servicios Python

```
Python 3.12+
FastAPI 0.111+
Celery 5.4+
python-docx 1.1+
PyMuPDF (fitz) 1.24+
WeasyPrint 62+
Pillow 10+
Tesseract OCR (sistema)
Pandoc CLI (sistema)
SQLAlchemy 2+ (async)
asyncpg (PostgreSQL async driver)
aioboto3 (S3/MinIO async)
```

### Frontend

```
React 18.3+
TypeScript 5.4+
Vite 5+
Zustand 4+ (estado global)
TanStack Query v5 (React Query)
Yjs 13+ (CRDTs)
y-websocket (WebSocket provider para Yjs)
TipTap 2+ (editor extensible sobre ProseMirror)
PDF.js (visualización PDF)
Framer Motion (animaciones)
Tailwind CSS 3+
Radix UI (componentes headless accesibles)
Workbox 7+ (Service Worker)
idb 8+ (IndexedDB wrapper tipado)
Keycloak JS adapter (autenticación)
```

### Observabilidad

```
Prometheus + Alertmanager       ← Métricas y alertas
Grafana 10+                     ← Dashboards
Loki + Promtail                 ← Logs centralizados
Jaeger (OpenTelemetry backend)  ← Distributed tracing
Kiali (si Istio)                ← Visualización service mesh
```

### DevOps

```
Docker 24+ + Docker Compose 2.20+  ← Desarrollo y staging
Kubernetes 1.29+ + Helm 3+         ← Producción
GitHub Actions                     ← CI/CD
Trivy                              ← Seguridad de imágenes
SonarQube                          ← Calidad de código
Renovate Bot                       ← Actualizaciones de dependencias
```

---

## 3. ARQUITECTURA ENTERPRISE — VISTA GLOBAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / CDN                          │
│                    (Cloudflare — DDoS, WAF)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/WSS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX (TLS Termination)                       │
│              Rate Limiting global · HTTP/2 · GZIP               │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌────────────────────────────────────────────┐
│  Web App     │     │         SPRING CLOUD GATEWAY               │
│  React SPA   │     │    Puerto 8080 — Entry point único APIs    │
│  :3000       │     │                                            │
└──────────────┘     │  ┌─────────────────────────────────────┐   │
                     │  │  Filtros Globales:                  │   │
                     │  │  · JWT Validation (Keycloak JWKS)   │   │
                     │  │  · Rate Limiting (Redis token bucket)│   │
                     │  │  · Request ID injection             │   │
                     │  │  · Correlation ID propagation       │   │
                     │  │  · Circuit Breaker (Resilience4j)   │   │
                     │  │  · Request/Response logging         │   │
                     │  │  · CORS global                      │   │
                     │  │  · Idempotency key validation       │   │
                     │  └─────────────────────────────────────┘   │
                     └──────────┬────────────────────────────────┘
                                │ Enrutamiento dinámico
                                │ vía Eureka Service Discovery
                     ┌──────────▼────────────────────────────┐
                     │        EUREKA SERVER :8761             │
                     │    Service Registry & Discovery        │
                     └──────────┬────────────────────────────┘
                                │ Servicios registrados
          ┌─────────────────────┼──────────────────────────────┐
          ▼                     ▼                              ▼
   ┌─────────────┐    ┌──────────────────┐         ┌─────────────────┐
   │auth-service │    │ document-service │         │  sync-service   │
   │   :8081     │    │     :8082        │         │    :8085 WS     │
   └──────┬──────┘    └────────┬─────────┘         └────────┬────────┘
          │                    │                             │
          ▼                    ▼                             ▼
   ┌─────────────┐    ┌──────────────────┐         ┌─────────────────┐
   │asset-service│    │ version-service  │         │ render-service  │
   │   :8083     │    │     :8084        │         │ Python :8086    │
   └─────────────┘    └──────────────────┘         └─────────────────┘
          │                    │
          ▼                    ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  CONFIG SERVER :8888                         │
   │         Configuración centralizada para todos               │
   │         los servicios (Git-backed)                          │
   └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    KAFKA EVENT BUS :9092                         │
│                                                                  │
│  Topics:                                                         │
│  · sdoc.documents.created    · sdoc.documents.updated           │
│  · sdoc.documents.deleted    · sdoc.assets.uploaded             │
│  · sdoc.exports.requested    · sdoc.notifications.send          │
│  · sdoc.versions.created     · sdoc.users.registered            │
│  · sdoc.sync.operations      · sdoc.billing.events              │
│                                                                  │
│  DLQ (Dead Letter Queue) por cada topic                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INFRAESTRUCTURA                               │
│                                                                  │
│  PostgreSQL 16  │  Redis 7.2  │  MinIO  │  Keycloak  │  Vault  │
│  :5432          │  :6379      │  :9000  │  :8090     │  :8200  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILIDAD                                │
│                                                                  │
│  Prometheus :9090  │  Grafana :3001  │  Jaeger :16686          │
│  Loki :3100        │  Alertmanager   │  OPA :8181              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. ESTRUCTURA DEL MONOREPO

```
sdoc-platform/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   └── security-scan.yml
│   └── renovate.json              ← Actualizaciones automáticas de deps
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml         ← Desarrollo local completo
│   │   ├── docker-compose.test.yml    ← CI testing
│   │   ├── docker-compose.monitoring.yml ← Stack observabilidad
│   │   └── nginx/
│   │       ├── nginx.conf
│   │       └── ssl/
│   ├── k8s/
│   │   ├── base/
│   │   ├── overlays/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── helm/sdoc/
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   ├── vault/
│   │   ├── config/
│   │   └── policies/
│   ├── keycloak/
│   │   └── realm-export.json
│   ├── kafka/
│   │   └── topics.sh
│   └── opa/
│       └── policies/
│
├── services/
│   ├── config-server/              ← Spring Cloud Config Server
│   ├── eureka-server/              ← Spring Cloud Eureka
│   ├── api-gateway/                ← Spring Cloud Gateway
│   ├── auth-service/
│   ├── document-service/
│   ├── sync-service/
│   ├── asset-service/
│   ├── version-service/
│   ├── notification-service/
│   └── render-service/             ← Python FastAPI
│
├── config-repo/                    ← Repositorio de configuración (Git)
│   ├── application.yml             ← Configuración global
│   ├── api-gateway.yml
│   ├── auth-service.yml
│   ├── document-service.yml
│   ├── sync-service.yml
│   ├── asset-service.yml
│   ├── version-service.yml
│   └── notification-service.yml
│
├── packages/
│   ├── sdoc-format/                ← TS: librería del formato .sdoc
│   ├── sdoc-editor/                ← React: editor embebible
│   ├── sdoc-viewer/                ← React: visor embebible
│   └── sdoc-sdk/                   ← TS: SDK público
│
├── apps/
│   ├── web/                        ← React + Vite
│   └── desktop/                    ← Tauri (Fase 4)
│
├── shared/
│   ├── java-commons/               ← Librería Java compartida (DTOs, utils)
│   └── ts-types/                   ← Tipos TypeScript compartidos
│
├── scripts/
│   ├── setup-dev.sh
│   ├── seed-db.sh
│   ├── vault-init.sh
│   └── kafka-topics.sh
│
├── docs/
│   ├── adr/                        ← Architecture Decision Records
│   ├── api/                        ← OpenAPI specs exportadas
│   └── runbooks/
│
├── .env.example
├── turbo.json                      ← Turborepo
└── README.md
```

---

## 5. SPRING CLOUD INFRASTRUCTURE LAYER

### 5.1 Config Server

El Config Server centraliza TODA la configuración de todos los microservicios. Los servicios arrancan leyendo su config desde aquí antes de inicializarse.

```
services/config-server/
├── build.gradle.kts
└── src/main/
    ├── java/app/sdoc/config/
    │   └── ConfigServerApplication.java
    └── resources/
        └── application.yml
```

**build.gradle.kts**
```kotlin
// services/config-server/build.gradle.kts
plugins {
    id("org.springframework.boot") version "3.3.1"
    id("io.spring.dependency-management") version "1.1.5"
    kotlin("jvm") version "1.9.24"
}

dependencies {
    implementation("org.springframework.cloud:spring-cloud-config-server")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.cloud:spring-cloud-starter-netflix-eureka-client")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:2023.0.2")
    }
}
```

**ConfigServerApplication.java**
```java
// services/config-server/src/main/java/app/sdoc/config/ConfigServerApplication.java
package app.sdoc.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.config.server.EnableConfigServer;
import org.springframework.cloud.netflix.eureka.EnableEurekaClient;

@SpringBootApplication
@EnableConfigServer
@EnableEurekaClient
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

**application.yml (Config Server)**
```yaml
# services/config-server/src/main/resources/application.yml
server:
  port: 8888

spring:
  application:
    name: config-server
  
  security:
    user:
      name: ${CONFIG_SERVER_USER:config-admin}
      password: ${CONFIG_SERVER_PASSWORD}  # Desde Vault
  
  cloud:
    config:
      server:
        git:
          uri: ${CONFIG_REPO_URI:file://${user.home}/sdoc-config-repo}
          default-label: main
          search-paths: '{application}'
          clone-on-start: true
          # En producción: repo privado con deploy key
          # private-key: ${CONFIG_REPO_PRIVATE_KEY}
        
        # Encriptar propiedades sensibles en el repo de config
        encrypt:
          enabled: true

  # Vault como backend de secretos para el Config Server
  vault:
    host: ${VAULT_HOST:vault}
    port: ${VAULT_PORT:8200}
    scheme: http
    authentication: TOKEN
    token: ${VAULT_TOKEN}
    kv:
      enabled: true
      default-context: sdoc
      backend: secret

eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_URL:http://eureka:8761/eureka/}
  instance:
    prefer-ip-address: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,refresh
  metrics:
    export:
      prometheus:
        enabled: true
  tracing:
    sampling:
      probability: 1.0

encrypt:
  key: ${CONFIG_ENCRYPT_KEY}  # Clave AES para propiedades {cipher}
```

**config-repo/application.yml (Configuración global compartida)**
```yaml
# config-repo/application.yml
# Configuración que aplica a TODOS los microservicios

spring:
  datasource:
    url: jdbc:postgresql://${POSTGRES_HOST:postgres}:5432/${POSTGRES_DB:sdoc_db}
    username: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
    hikari:
      connection-timeout: 30000
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 600000
      max-lifetime: 1800000
      connection-test-query: SELECT 1
  
  jpa:
    hibernate:
      ddl-auto: validate     # Flyway maneja las migraciones
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
  
  data:
    redis:
      host: ${REDIS_HOST:redis}
      port: 6379
      password: ${REDIS_PASSWORD}
      lettuce:
        pool:
          max-active: 8
          max-idle: 4
          min-idle: 1
  
  kafka:
    bootstrap-servers: ${KAFKA_BROKERS:kafka:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all
      retries: 3
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    consumer:
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        spring.json.trusted.packages: "app.sdoc.*"
  
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${KEYCLOAK_URL:http://keycloak:8080}/realms/sdoc
          jwk-set-uri: ${KEYCLOAK_URL:http://keycloak:8080}/realms/sdoc/protocol/openid-connect/certs

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,loggers,circuitbreakers
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${ENVIRONMENT:development}
  tracing:
    sampling:
      probability: 1.0

resilience4j:
  circuitbreaker:
    configs:
      default:
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        automatic-transition-from-open-to-half-open-enabled: true
        record-exceptions:
          - java.net.ConnectException
          - java.util.concurrent.TimeoutException
          - feign.FeignException.ServiceUnavailable
  
  retry:
    configs:
      default:
        max-attempts: 3
        wait-duration: 500ms
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.net.ConnectException
          - feign.RetryableException
  
  bulkhead:
    configs:
      default:
        max-concurrent-calls: 20
        max-wait-duration: 100ms
  
  timelimiter:
    configs:
      default:
        timeout-duration: 10s

logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] [%X{traceId}/%X{spanId}] %-5level %logger{36} - %msg%n"
  level:
    app.sdoc: INFO
    org.springframework.security: WARN
    org.hibernate.SQL: WARN
```

---

### 5.2 Eureka Server (Service Discovery)

```
services/eureka-server/
├── build.gradle.kts
└── src/main/
    ├── java/app/sdoc/eureka/
    │   └── EurekaServerApplication.java
    └── resources/
        └── application.yml
```

**EurekaServerApplication.java**
```java
package app.sdoc.eureka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

**application.yml (Eureka Server)**
```yaml
server:
  port: 8761

spring:
  application:
    name: eureka-server
  
  security:
    user:
      name: ${EUREKA_USER:eureka-admin}
      password: ${EUREKA_PASSWORD}

eureka:
  instance:
    hostname: ${EUREKA_HOSTNAME:eureka}
    prefer-ip-address: false
  
  client:
    register-with-eureka: false    # El server no se registra a sí mismo
    fetch-registry: false
    service-url:
      defaultZone: http://${EUREKA_USER}:${EUREKA_PASSWORD}@${eureka.instance.hostname}:${server.port}/eureka/
  
  server:
    enable-self-preservation: true
    eviction-interval-timer-in-ms: 15000
    renewal-percent-threshold: 0.85
    wait-time-in-ms-when-sync-empty: 0

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

**bootstrap.yml (patrón para TODOS los microservicios)**
```yaml
# Cada microservicio necesita este bootstrap.yml para conectarse al Config Server
# services/[nombre-servicio]/src/main/resources/bootstrap.yml

spring:
  application:
    name: [NOMBRE_SERVICIO]  # Ej: document-service
  
  config:
    import: "configserver:"
  
  cloud:
    config:
      uri: ${CONFIG_SERVER_URI:http://config-server:8888}
      username: ${CONFIG_SERVER_USER:config-admin}
      password: ${CONFIG_SERVER_PASSWORD}
      fail-fast: true
      retry:
        initial-interval: 1000
        max-interval: 2000
        max-attempts: 6
  
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:default}
```

---

### 5.3 Spring Cloud Gateway

El Gateway es el único punto de entrada externo para todas las APIs. Implementa autenticación, rate limiting, circuit breaking y enrutamiento dinámico.

```
services/api-gateway/src/main/
├── java/app/sdoc/gateway/
│   ├── GatewayApplication.java
│   ├── config/
│   │   ├── GatewayConfig.java
│   │   ├── SecurityConfig.java
│   │   └── RateLimitConfig.java
│   ├── filters/
│   │   ├── GlobalAuthFilter.java
│   │   ├── RequestIdFilter.java
│   │   ├── CorrelationIdFilter.java
│   │   ├── RequestLoggingFilter.java
│   │   └── IdempotencyFilter.java
│   └── fallback/
│       └── GatewayFallbackController.java
└── resources/
    └── application.yml
```

**GatewayApplication.java**
```java
package app.sdoc.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```

**GatewayConfig.java — Rutas y Circuit Breakers**
```java
package app.sdoc.gateway.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;
import java.time.Duration;

@Configuration
public class GatewayConfig {

    // ============================================================
    // DEFINICIÓN DE RUTAS
    // ============================================================
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()

            // ---- AUTH SERVICE ----
            .route("auth-service", r -> r
                .path("/api/v1/auth/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .filter(new RequestIdFilter())
                    .circuitBreaker(config -> config
                        .setName("auth-service-cb")
                        .setFallbackUri("forward:/fallback/auth"))
                    .retry(retryConfig -> retryConfig
                        .setRetries(2)
                        .setMethods(HttpMethod.GET)
                        .setBackoff(Duration.ofMillis(100), Duration.ofMillis(500), 2, true))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(authRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://auth-service"))

            // ---- DOCUMENT SERVICE ----
            .route("document-service", r -> r
                .path("/api/v1/documents/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .filter(correlationIdFilter())
                    .circuitBreaker(config -> config
                        .setName("document-service-cb")
                        .setFallbackUri("forward:/fallback/documents"))
                    .retry(retryConfig -> retryConfig
                        .setRetries(3)
                        .setMethods(HttpMethod.GET)
                        .setBackoff(Duration.ofMillis(200), Duration.ofSeconds(2), 2, true))
                    .requestRateLimiter(config -> config
                        .setRateLimiter(defaultRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                    .addResponseHeader("X-Service", "document-service"))
                .uri("lb://document-service"))

            // ---- ASSET SERVICE ----
            .route("asset-service", r -> r
                .path("/api/v1/assets/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .circuitBreaker(config -> config
                        .setName("asset-service-cb")
                        .setFallbackUri("forward:/fallback/assets"))
                    // Rate limiting más estricto para uploads
                    .requestRateLimiter(config -> config
                        .setRateLimiter(uploadRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://asset-service"))

            // ---- VERSION SERVICE ----
            .route("version-service", r -> r
                .path("/api/v1/documents/*/versions/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .circuitBreaker(config -> config
                        .setName("version-service-cb")
                        .setFallbackUri("forward:/fallback/versions")))
                .uri("lb://version-service"))

            // ---- RENDER SERVICE ----
            .route("render-service", r -> r
                .path("/api/v1/render/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .circuitBreaker(config -> config
                        .setName("render-service-cb")
                        .setFallbackUri("forward:/fallback/render"))
                    // Jobs de render son lentos — timeout generoso
                    .requestRateLimiter(config -> config
                        .setRateLimiter(renderRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://render-service"))

            // ---- SYNC SERVICE (WebSocket) ----
            .route("sync-service-ws", r -> r
                .path("/ws/**")
                .filters(f -> f.stripPrefix(0))
                .uri("lb:ws://sync-service"))

            .build();
    }

    // ============================================================
    // RATE LIMITERS (Redis Token Bucket)
    // ============================================================
    @Bean
    public RedisRateLimiter defaultRateLimiter() {
        // 100 req/s replenish rate, burst de 200
        return new RedisRateLimiter(100, 200, 1);
    }

    @Bean
    public RedisRateLimiter authRateLimiter() {
        // Auth endpoints: más restrictivo contra brute force
        return new RedisRateLimiter(10, 20, 1);
    }

    @Bean
    public RedisRateLimiter uploadRateLimiter() {
        // Uploads: limitado por usuario
        return new RedisRateLimiter(5, 10, 1);
    }

    @Bean
    public RedisRateLimiter renderRateLimiter() {
        // Renders son costosos
        return new RedisRateLimiter(3, 5, 1);
    }

    // ============================================================
    // KEY RESOLVERS
    // ============================================================
    @Bean
    public KeyResolver userKeyResolver() {
        // Rate limit por usuario autenticado (sub del JWT)
        // Fallback a IP si no está autenticado
        return exchange -> {
            var auth = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                String token = auth.substring(7);
                String subject = extractSubFromJwt(token);
                return Mono.just("user:" + subject);
            }
            String ip = exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
            return Mono.just("ip:" + ip);
        };
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(
            exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown"
        );
    }

    // ============================================================
    // CIRCUIT BREAKER FACTORY
    // ============================================================
    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> circuitBreakerCustomizer() {
        return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
            .circuitBreakerConfig(CircuitBreakerConfig.custom()
                .slidingWindowSize(10)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build())
            .timeLimiterConfig(TimeLimiterConfig.custom()
                .timeoutDuration(Duration.ofSeconds(10))
                .build())
            .build());
    }

    private String extractSubFromJwt(String token) {
        // Decodificación básica del payload JWT (sin verificación — ya verificado por Security)
        String[] parts = token.split("\\.");
        if (parts.length < 2) return "unknown";
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
        // Extraer 'sub' del JSON
        return payload.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
    }
}
```

**GlobalAuthFilter.java — Validación JWT + Propagación de identidad**
```java
package app.sdoc.gateway.filters;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class GlobalAuthFilter implements GlobalFilter, Ordered {

    private static final String[] PUBLIC_PATHS = {
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/actuator/health",
        "/api/v1/documents/shared/"  // Documentos compartidos por token público
    };

    private final ReactiveJwtDecoder jwtDecoder;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        // Rutas públicas — pasar sin validar
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        return jwtDecoder.decode(token)
            .flatMap(jwt -> {
                // Propagar información del usuario a los microservicios downstream
                // mediante cabeceras internas (no expuestas al cliente)
                ServerWebExchange mutatedExchange = exchange.mutate()
                    .request(request -> request
                        .header("X-User-Id", jwt.getSubject())
                        .header("X-User-Email", (String) jwt.getClaim("email"))
                        .header("X-User-Roles", String.join(",", 
                            jwt.<List<String>>getClaim("roles")))
                        .header("X-Org-Id", 
                            jwt.getClaim("organization_id") != null 
                                ? jwt.getClaim("organization_id").toString() 
                                : ""))
                    .build();
                return chain.filter(mutatedExchange);
            })
            .onErrorResume(ex -> {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            });
    }

    @Override
    public int getOrder() {
        return -1; // Ejecutar primero
    }

    private boolean isPublicPath(String path) {
        for (String publicPath : PUBLIC_PATHS) {
            if (path.startsWith(publicPath)) return true;
        }
        return false;
    }
}
```

**RequestIdFilter.java + CorrelationIdFilter.java**
```java
// RequestIdFilter — genera ID único por request para trazabilidad
@Component
public class RequestIdFilter implements GatewayFilter, Ordered {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String requestId = exchange.getRequest().getHeaders()
            .getFirst(REQUEST_ID_HEADER);
        
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        
        final String finalRequestId = requestId;
        
        return chain.filter(exchange.mutate()
            .request(r -> r.header(REQUEST_ID_HEADER, finalRequestId))
            .response(r -> {
                r.getHeaders().add(REQUEST_ID_HEADER, finalRequestId);
                return r;
            })
            .build());
    }

    @Override
    public int getOrder() { return -2; }
}

// IdempotencyFilter — previene procesamiento duplicado de requests POST/PUT
@Component
public class IdempotencyFilter implements GlobalFilter, Ordered {
    
    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
    private final ReactiveRedisTemplate<String, String> redis;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpMethod method = exchange.getRequest().getMethod();
        
        // Solo aplicar a métodos no idempotentes
        if (method != HttpMethod.POST && method != HttpMethod.PATCH) {
            return chain.filter(exchange);
        }
        
        String idempotencyKey = exchange.getRequest().getHeaders()
            .getFirst(IDEMPOTENCY_KEY_HEADER);
        
        if (idempotencyKey == null) {
            return chain.filter(exchange); // No requerido, pero recomendado
        }
        
        String redisKey = "idempotency:" + idempotencyKey;
        
        return redis.hasKey(redisKey)
            .flatMap(exists -> {
                if (exists) {
                    // Request duplicada — devolver respuesta cacheada
                    return redis.opsForValue().get(redisKey)
                        .flatMap(cachedResponse -> {
                            exchange.getResponse().setStatusCode(HttpStatus.OK);
                            exchange.getResponse().getHeaders()
                                .add("X-Idempotent-Replayed", "true");
                            DataBuffer buffer = exchange.getResponse().bufferFactory()
                                .wrap(cachedResponse.getBytes());
                            return exchange.getResponse().writeWith(Mono.just(buffer));
                        });
                }
                // Marcar como procesada con TTL 24h
                return redis.opsForValue()
                    .set(redisKey, "processing", Duration.ofHours(24))
                    .then(chain.filter(exchange));
            });
    }

    @Override
    public int getOrder() { return -3; }
}
```

**GatewayFallbackController.java**
```java
@RestController
@RequestMapping("/fallback")
public class GatewayFallbackController {

    @RequestMapping("/documents")
    public ResponseEntity<Map<String, Object>> documentsFallback(ServerWebExchange exchange) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
            "success", false,
            "error", Map.of(
                "code", "SERVICE_UNAVAILABLE",
                "message", "El servicio de documentos no está disponible temporalmente. Inténtalo en unos segundos.",
                "retryAfter", 30
            ),
            "meta", Map.of("timestamp", Instant.now().toString())
        ));
    }

    @RequestMapping("/auth")
    public ResponseEntity<Map<String, Object>> authFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
            "success", false,
            "error", Map.of(
                "code", "AUTH_SERVICE_UNAVAILABLE",
                "message", "El servicio de autenticación no está disponible temporalmente."
            )
        ));
    }

    @RequestMapping("/render")
    public ResponseEntity<Map<String, Object>> renderFallback() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
            "success", false,
            "error", Map.of(
                "code", "RENDER_QUEUED",
                "message", "El servicio de renderizado está procesando muchas solicitudes. Tu exportación se procesará cuando esté disponible."
            )
        ));
    }
}
```

---

### 5.4 Resilience4j — Configuración Completa

Cada microservicio importa la config global del Config Server y puede sobreescribir localmente.

**config-repo/document-service.yml**
```yaml
# Configuración específica del document-service
# Sobreescribe la global de application.yml

resilience4j:
  circuitbreaker:
    instances:
      asset-service-client:
        base-config: default
        sliding-window-size: 20
        failure-rate-threshold: 40
        wait-duration-in-open-state: 20s
      
      version-service-client:
        base-config: default
        failure-rate-threshold: 60  # Más tolerante
  
  bulkhead:
    instances:
      asset-service-client:
        max-concurrent-calls: 10
        max-wait-duration: 50ms
      version-service-client:
        max-concurrent-calls: 5
  
  timelimiter:
    instances:
      render-service-client:
        timeout-duration: 60s  # Renders pueden tardar
      asset-service-client:
        timeout-duration: 15s
```

**Uso de Resilience4j en un servicio Java**
```java
// En cualquier microservicio que llame a otro
@Service
public class DocumentService {

    private final AssetServiceClient assetClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @CircuitBreaker(name = "asset-service-client", fallbackMethod = "getAssetsFallback")
    @Retry(name = "asset-service-client")
    @Bulkhead(name = "asset-service-client", type = Bulkhead.Type.SEMAPHORE)
    @TimeLimiter(name = "asset-service-client")
    public CompletableFuture<List<AssetDto>> getDocumentAssets(String documentId) {
        return CompletableFuture.supplyAsync(() -> assetClient.getAssets(documentId));
    }

    // Fallback cuando el circuit está abierto
    private CompletableFuture<List<AssetDto>> getAssetsFallback(
        String documentId, Exception ex
    ) {
        log.warn("Asset service unavailable for doc {}, returning empty assets: {}", 
            documentId, ex.getMessage());
        return CompletableFuture.completedFuture(Collections.emptyList());
    }
}
```

---

## 6. ESPECIFICACIÓN FORMATO .SDOC

### Estructura Interna

Un `.sdoc` es un ZIP container con estructura fija:

```
documento.sdoc (ZIP)
├── manifest.json             ← Metadatos globales (SIEMPRE presente)
├── content/
│   ├── document.json         ← Contenido estructurado (nodos)
│   ├── styles.json           ← Tema y estilos
│   └── layout.json           ← Layout/páginas
├── assets/
│   ├── images/               ← WebP preferido
│   ├── videos/               ← Solo referenciados si >10MB
│   └── fonts/                ← Tipografías embebidas
├── revisions/
│   ├── index.json            ← Índice de revisiones
│   └── patches/
│       └── patch-NNN.json    ← Diffs diferenciales
├── sync/
│   ├── crdt-state.bin        ← Estado Yjs serializado
│   └── pending-ops.json      ← Ops pendientes de sync
├── permissions/
│   └── acl.json              ← ACL del documento
├── security/
│   ├── signature.json        ← Firma Ed25519 del documento
│   └── encryption-meta.json  ← Metadatos de cifrado (NO la clave)
└── preview/
    ├── thumbnail.webp        ← 400x300px
    ├── preview.pdf           ← Primeras 3 páginas
    └── preview.html          ← Fallback universal
```

### manifest.json — Esquema Completo

```json
{
  "$schema": "https://sdoc.app/schemas/manifest/v1.json",
  "formatVersion": "1.0.0",
  "id": "doc_01J8XKQM5N3P7R9T2V4W6Y8Z0",
  "title": "Documento de Ejemplo",
  "description": "Descripción opcional",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T14:22:35.128Z",
  "version": 42,
  "schemaVersion": "1.0.0",
  "owner": {
    "id": "usr_01J8XKQM5N3P7R9T2V4W6Y8Z0",
    "email": "usuario@ejemplo.com",
    "name": "Santiago Aguilar"
  },
  "settings": {
    "syncEnabled": true,
    "offlineEnabled": true,
    "collaborationEnabled": true,
    "versioningEnabled": true,
    "maxVersions": 100,
    "autoSaveIntervalSeconds": 30
  },
  "security": {
    "encryption": "AES-256-GCM",
    "keyDerivation": "HKDF-SHA256",
    "contentChecksum": "sha256:abc123...",
    "manifestChecksum": "sha256:def456...",
    "signatureAlgorithm": "Ed25519",
    "signatureRef": "security/signature.json",
    "encryptedContent": false
  },
  "meta": {
    "wordCount": 1240,
    "pageCount": 5,
    "readingTimeSeconds": 372,
    "language": "es",
    "tags": ["investigación", "2025"],
    "aiGenerated": false
  }
}
```

### Tipos de Nodos — document.json

```json
{
  "type": "document",
  "version": "1.0",
  "pages": [{
    "id": "page_001",
    "order": 1,
    "size": { "width": 794, "height": 1123, "unit": "px" },
    "margins": { "top": 72, "right": 72, "bottom": 72, "left": 72 },
    "elements": [
      { "id": "e001", "type": "heading", "attrs": {"level": 1},
        "children": [{"type": "text", "content": "Título", "marks": ["bold"]}] },
      { "id": "e002", "type": "paragraph",
        "children": [
          {"type": "text", "content": "Texto normal. "},
          {"type": "text", "content": "Negrita", "marks": ["bold"]},
          {"type": "text", "content": " e "},
          {"type": "text", "content": "itálica", "marks": ["italic"]},
          {"type": "text", "content": "."}
        ]},
      { "id": "e003", "type": "image",
        "src": "assets/images/foto.webp", "alt": "Alt text",
        "width": 400, "height": 300, "alignment": "center" },
      { "id": "e004", "type": "table", "rows": 3, "cols": 4,
        "cells": [] },
      { "id": "e005", "type": "codeblock",
        "language": "java", "content": "public class Main {}" },
      { "id": "e006", "type": "embed", "embedType": "chart",
        "data": {}, "fallback": "assets/images/chart-fallback.webp" }
    ]
  }]
}
```

---

## 7. MICROSERVICIOS — DISEÑO COMPLETO

### Patrón Base de Cada Microservicio

Todos los servicios Java siguen esta estructura:

```
services/[nombre]/
├── build.gradle.kts
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/app/sdoc/[nombre]/
    │   │   ├── [Nombre]Application.java
    │   │   ├── config/
    │   │   │   ├── SecurityConfig.java
    │   │   │   ├── KafkaConfig.java
    │   │   │   └── OpenApiConfig.java
    │   │   ├── controller/
    │   │   │   └── [Entidad]Controller.java
    │   │   ├── service/
    │   │   │   └── [Entidad]Service.java
    │   │   ├── repository/
    │   │   │   └── [Entidad]Repository.java
    │   │   ├── domain/
    │   │   │   ├── entity/
    │   │   │   ├── dto/
    │   │   │   └── event/          ← Kafka events
    │   │   ├── client/             ← Feign clients a otros servicios
    │   │   ├── kafka/
    │   │   │   ├── producer/
    │   │   │   └── consumer/
    │   │   └── exception/
    │   └── resources/
    │       ├── bootstrap.yml
    │       └── db/migration/       ← Flyway scripts
    └── test/
```

**build.gradle.kts — Template base para todos los servicios Java**
```kotlin
plugins {
    id("org.springframework.boot") version "3.3.1"
    id("io.spring.dependency-management") version "1.1.5"
    id("java")
}

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

configurations { compileOnly { extendsFrom(configurations.annotationProcessor.get()) } }

dependencies {
    // Spring Boot core
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-redis-reactive")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Spring Cloud
    implementation("org.springframework.cloud:spring-cloud-starter-netflix-eureka-client")
    implementation("org.springframework.cloud:spring-cloud-starter-config")
    implementation("org.springframework.cloud:spring-cloud-starter-openfeign")
    implementation("org.springframework.cloud:spring-cloud-starter-loadbalancer")
    implementation("org.springframework.cloud:spring-cloud-starter-circuitbreaker-resilience4j")

    // Kafka
    implementation("org.springframework.kafka:spring-kafka")

    // Security
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // Database
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // Observabilidad
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.micrometer:micrometer-tracing-bridge-otel")
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")

    // Utilidades
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    implementation("org.mapstruct:mapstruct:1.5.5.Final")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.5.5.Final")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:kafka")
    testImplementation("io.rest-assured:rest-assured")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:2023.0.2")
        mavenBom("org.testcontainers:testcontainers-bom:1.19.8")
    }
}
```

---

### 7.1 auth-service

```java
// services/auth-service/src/main/java/app/sdoc/auth/service/AuthService.java
@Service
@Transactional
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdmin;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public UserRegisteredResponse register(RegisterRequest request) {
        // 1. Validar que email no existe
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        // 2. Crear usuario en Keycloak
        String keycloakId = keycloakAdmin.createUser(
            request.email(), request.password(), request.fullName()
        );

        // 3. Crear usuario en PostgreSQL
        User user = User.builder()
            .keycloakId(keycloakId)
            .email(request.email())
            .username(generateUsername(request.email()))
            .fullName(request.fullName())
            .plan(Plan.FREE)
            .storageUsedBytes(0L)
            .storageLimitBytes(1_073_741_824L) // 1GB
            .build();
        
        user = userRepository.save(user);

        // 4. Publicar evento en Kafka (async — no bloquea el registro)
        kafkaTemplate.send("sdoc.users.registered", user.getId().toString(),
            new UserRegisteredEvent(user.getId(), user.getEmail(), user.getFullName(), Instant.now())
        );

        log.info("User registered: {} (Keycloak ID: {})", user.getEmail(), keycloakId);
        
        return UserRegisteredResponse.from(user);
    }

    public TokenResponse login(LoginRequest request) {
        // Autenticar contra Keycloak (Resource Owner Password — solo para MVP)
        // En producción usar Authorization Code Flow desde el frontend
        KeycloakTokenResponse keycloakTokens = keycloakAdmin.authenticate(
            request.email(), request.password()
        );
        
        return TokenResponse.builder()
            .accessToken(keycloakTokens.accessToken())
            .refreshToken(keycloakTokens.refreshToken())
            .expiresIn(keycloakTokens.expiresIn())
            .tokenType("Bearer")
            .build();
    }

    public TokenResponse refresh(String refreshToken) {
        KeycloakTokenResponse tokens = keycloakAdmin.refreshToken(refreshToken);
        return TokenResponse.from(tokens);
    }
}
```

---

### 7.2 document-service — Completo

```java
// services/document-service/src/main/java/app/sdoc/document/service/DocumentService.java
@Service
@Transactional
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final AssetServiceClient assetClient;
    private final VersionServiceClient versionClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final DocumentEncryptionService encryptionService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final OpaClient opaClient;

    // ---- CREAR DOCUMENTO ----
    public DocumentResponse createDocument(CreateDocumentRequest request, String userId) {
        Document doc = Document.builder()
            .id(UUID.randomUUID())
            .ownerId(UUID.fromString(userId))
            .title(request.title())
            .description(request.description())
            .content(DocumentContent.empty())
            .status(DocumentStatus.DRAFT)
            .version(1)
            .syncEnabled(true)
            .language(request.language() != null ? request.language() : "es")
            .tags(request.tags() != null ? request.tags() : new ArrayList<>())
            .build();
        
        doc = documentRepository.save(doc);

        // Publicar evento — version-service y notification-service escuchan
        kafkaTemplate.send("sdoc.documents.created",
            doc.getId().toString(),
            DocumentCreatedEvent.from(doc, userId)
        );

        // Invalidar caché del dashboard del usuario
        redisTemplate.delete("dashboard:docs:" + userId);

        log.info("Document created: {} by user {}", doc.getId(), userId);
        return DocumentMapper.INSTANCE.toResponse(doc);
    }

    // ---- OBTENER DOCUMENTO (con control de acceso) ----
    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID documentId, String userId) {
        Document doc = documentRepository.findByIdAndNotDeleted(documentId)
            .orElseThrow(() -> new DocumentNotFoundException(documentId));

        // Verificar permiso via OPA
        opaClient.enforce(OpaInput.builder()
            .action("read")
            .userId(userId)
            .documentId(documentId.toString())
            .documentOwnerId(doc.getOwnerId().toString())
            .isPublic(doc.isPublic())
            .build()
        );

        // Intentar desde caché Redis
        String cacheKey = "doc:content:" + documentId;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return (DocumentResponse) cached;
        }

        DocumentResponse response = DocumentMapper.INSTANCE.toResponse(doc);
        redisTemplate.opsForValue().set(cacheKey, response, Duration.ofMinutes(10));
        
        return response;
    }

    // ---- ACTUALIZAR CONTENIDO ----
    public DocumentResponse updateContent(UUID documentId, UpdateContentRequest request, String userId) {
        Document doc = documentRepository.findByIdAndNotDeleted(documentId)
            .orElseThrow(() -> new DocumentNotFoundException(documentId));

        opaClient.enforce(OpaInput.builder()
            .action("edit").userId(userId)
            .documentId(documentId.toString())
            .documentOwnerId(doc.getOwnerId().toString()).build());

        // Calcular checksum del contenido
        String checksum = encryptionService.calculateChecksum(request.content());

        doc.setContent(request.content());
        doc.setWordCount(countWords(request.content()));
        doc.setVersion(doc.getVersion() + 1);
        doc.setContentChecksum(checksum);
        doc = documentRepository.save(doc);

        // Invalidar caché
        redisTemplate.delete("doc:content:" + documentId);

        // Evento para version-service (crear auto-snapshot si N cambios)
        kafkaTemplate.send("sdoc.documents.updated",
            documentId.toString(),
            DocumentUpdatedEvent.from(doc, userId, request.content())
        );

        return DocumentMapper.INSTANCE.toResponse(doc);
    }

    // ---- BÚSQUEDA FULL-TEXT ----
    @Transactional(readOnly = true)
    public Page<DocumentSummaryResponse> searchDocuments(
        String query, String userId, Pageable pageable
    ) {
        return documentRepository.searchByOwnerAndQuery(
            UUID.fromString(userId), query, pageable
        ).map(DocumentMapper.INSTANCE::toSummaryResponse);
    }

    // ---- SOFT DELETE ----
    public void deleteDocument(UUID documentId, String userId) {
        Document doc = documentRepository.findByIdAndNotDeleted(documentId)
            .orElseThrow(() -> new DocumentNotFoundException(documentId));

        opaClient.enforce(OpaInput.builder()
            .action("delete").userId(userId)
            .documentId(documentId.toString())
            .documentOwnerId(doc.getOwnerId().toString()).build());

        doc.setDeletedAt(Instant.now());
        documentRepository.save(doc);

        // Limpiar caché
        redisTemplate.delete("doc:content:" + documentId);
        redisTemplate.delete("dashboard:docs:" + userId);

        // Notificar a otros servicios
        kafkaTemplate.send("sdoc.documents.deleted",
            documentId.toString(),
            DocumentDeletedEvent.from(doc, userId)
        );
    }
}
```

**DocumentRepository.java**
```java
@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT d FROM Document d WHERE d.id = :id AND d.deletedAt IS NULL")
    Optional<Document> findByIdAndNotDeleted(@Param("id") UUID id);

    @Query("SELECT d FROM Document d WHERE d.ownerId = :ownerId AND d.deletedAt IS NULL ORDER BY d.updatedAt DESC")
    Page<Document> findByOwnerIdAndNotDeleted(@Param("ownerId") UUID ownerId, Pageable pageable);

    // Búsqueda FTS con ranking por relevancia
    @Query(value = """
        SELECT d.* FROM documents d
        WHERE d.owner_id = :ownerId
          AND d.deleted_at IS NULL
          AND d.search_vector @@ plainto_tsquery('spanish', :query)
        ORDER BY ts_rank(d.search_vector, plainto_tsquery('spanish', :query)) DESC
        """, nativeQuery = true)
    Page<Document> searchByOwnerAndQuery(
        @Param("ownerId") UUID ownerId,
        @Param("query") String query,
        Pageable pageable
    );

    @Query("SELECT COUNT(d) FROM Document d WHERE d.ownerId = :ownerId AND d.deletedAt IS NULL")
    long countByOwnerId(@Param("ownerId") UUID ownerId);
}
```

---

### 7.3 sync-service — WebSocket + Yjs CRDTs

```java
// services/sync-service/src/main/java/app/sdoc/sync/handler/SyncWebSocketHandler.java
@Component
@Slf4j
public class SyncWebSocketHandler implements WebSocketHandler {

    private final SyncSessionRegistry sessionRegistry;
    private final CrdtStateManager crdtStateManager;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final JwtValidator jwtValidator;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // Extraer parámetros de la URL: /ws/sync/{documentId}?token={jwt}
        String documentId = extractDocumentId(session);
        String token = extractToken(session);

        // Validar JWT antes de aceptar la conexión WebSocket
        return jwtValidator.validate(token)
            .flatMap(userId -> handleAuthenticatedSession(session, documentId, userId))
            .onErrorResume(ex -> {
                log.warn("WS auth failed: {}", ex.getMessage());
                return session.close(CloseStatus.NOT_ACCEPTABLE);
            });
    }

    private Mono<Void> handleAuthenticatedSession(
        WebSocketSession session, String documentId, String userId
    ) {
        log.info("WS connected: user={} doc={} session={}", userId, documentId, session.getId());

        // Registrar cliente
        sessionRegistry.register(documentId, userId, session);

        // 1. Enviar estado CRDT actual al nuevo cliente
        Mono<Void> syncInit = crdtStateManager.getCurrentState(documentId)
            .flatMap(state -> {
                if (state != null && state.length > 0) {
                    SyncMessage initMsg = SyncMessage.syncInit(state);
                    return session.send(Mono.just(
                        session.binaryMessage(factory -> factory.wrap(initMsg.serialize()))
                    ));
                }
                return Mono.empty();
            });

        // 2. Enviar awareness de colaboradores activos
        Mono<Void> awarenessInit = sessionRegistry.getActiveUsers(documentId)
            .flatMap(users -> {
                SyncMessage awarenessMsg = SyncMessage.awarenessUpdate(documentId, users);
                return session.send(Mono.just(
                    session.textMessage(awarenessMsg.toJson())
                ));
            });

        // 3. Procesar mensajes entrantes
        Flux<Void> messageHandler = session.receive()
            .doOnNext(msg -> log.debug("WS msg: type={} from={}", msg.getType(), userId))
            .flatMap(msg -> processMessage(msg, documentId, userId, session))
            .onErrorContinue((ex, msg) -> 
                log.error("Error processing WS message from {}: {}", userId, ex.getMessage()));

        return syncInit
            .then(awarenessInit)
            .thenMany(messageHandler)
            .doFinally(signal -> {
                sessionRegistry.unregister(documentId, userId);
                // Notificar a colaboradores que el usuario se fue
                sessionRegistry.broadcastToOthers(documentId, userId,
                    SyncMessage.userLeft(userId).toJson()
                ).subscribe();
                log.info("WS disconnected: user={} doc={} reason={}", userId, documentId, signal);
            })
            .then();
    }

    private Mono<Void> processMessage(
        WebSocketMessage msg, String documentId, String userId, WebSocketSession session
    ) {
        if (msg.getType() == WebSocketMessage.Type.BINARY) {
            return handleBinaryMessage(msg.getPayload().asByteArray(), documentId, userId);
        }

        String payload = msg.getPayloadAsText();
        SyncMessage syncMsg = SyncMessage.fromJson(payload);

        return switch (syncMsg.getType()) {
            case "yjs-update" -> handleYjsUpdate(syncMsg, documentId, userId);
            case "awareness" -> handleAwareness(syncMsg, documentId, userId);
            case "cursor" -> handleCursorUpdate(syncMsg, documentId, userId, session);
            case "ping" -> session.send(Mono.just(session.textMessage("{\"type\":\"pong\"}")));
            default -> {
                log.warn("Unknown WS message type: {}", syncMsg.getType());
                yield Mono.empty();
            }
        };
    }

    private Mono<Void> handleYjsUpdate(SyncMessage msg, String documentId, String userId) {
        byte[] update = msg.getYjsUpdate();

        // 1. Merge en Redis (estado acumulado)
        return crdtStateManager.applyUpdate(documentId, update)
            // 2. Broadcast a colaboradores (excepto el emisor)
            .then(sessionRegistry.broadcastBinaryToOthers(documentId, userId, update))
            // 3. Publicar en Kafka para persistencia async
            .then(Mono.fromRunnable(() ->
                kafkaTemplate.send("sdoc.sync.operations",
                    documentId,
                    new SyncOperationEvent(documentId, userId, update, Instant.now())
                )
            ));
    }
}
```

**CrdtStateManager.java**
```java
@Service
public class CrdtStateManager {

    private final ReactiveRedisTemplate<String, byte[]> redisTemplate;
    private static final String CRDT_KEY_PREFIX = "crdt:state:";
    private static final Duration CRDT_TTL = Duration.ofDays(7);

    public Mono<byte[]> getCurrentState(String documentId) {
        return redisTemplate.opsForValue().get(CRDT_KEY_PREFIX + documentId);
    }

    public Mono<Void> applyUpdate(String documentId, byte[] update) {
        String key = CRDT_KEY_PREFIX + documentId;
        // Usar Lua script atómico para merge del estado CRDT
        return redisTemplate.execute(
            RedisScript.of(MERGE_CRDT_SCRIPT, byte[].class),
            List.of(key),
            update
        ).then(redisTemplate.expire(key, CRDT_TTL)).then();
    }

    // Script Lua para merge atómico (previene race conditions)
    private static final String MERGE_CRDT_SCRIPT = """
        local current = redis.call('GET', KEYS[1])
        if current == false then
            redis.call('SET', KEYS[1], ARGV[1])
        else
            -- En implementación real: merge Yjs binario via librería nativa
            -- Para MVP: simplemente almacenar el update más reciente
            redis.call('SET', KEYS[1], ARGV[1])
        end
        return redis.call('TTL', KEYS[1])
        """;
}
```

---

## 8. COMUNICACIÓN ENTRE SERVICIOS

### 8.1 OpenFeign — Clientes HTTP Declarativos

Cada servicio que necesita llamar a otro define un Feign Client.

```java
// En document-service: cliente para asset-service
// services/document-service/src/main/java/app/sdoc/document/client/AssetServiceClient.java

@FeignClient(
    name = "asset-service",          // Nombre en Eureka
    configuration = FeignConfig.class,
    fallbackFactory = AssetServiceFallbackFactory.class
)
public interface AssetServiceClient {

    @GetMapping("/api/v1/assets/document/{documentId}")
    @CircuitBreaker(name = "asset-service-client")
    List<AssetDto> getAssetsByDocument(@PathVariable String documentId);

    @PostMapping("/api/v1/assets/presigned-url")
    PresignedUrlResponse getPresignedUploadUrl(@RequestBody PresignedUrlRequest request);

    @DeleteMapping("/api/v1/assets/{assetId}")
    void deleteAsset(@PathVariable String assetId);
}

// Fallback factory
@Component
public class AssetServiceFallbackFactory implements FallbackFactory<AssetServiceClient> {
    @Override
    public AssetServiceClient create(Throwable cause) {
        return new AssetServiceClient() {
            @Override
            public List<AssetDto> getAssetsByDocument(String documentId) {
                log.warn("AssetService fallback for doc {}: {}", documentId, cause.getMessage());
                return Collections.emptyList();
            }
            @Override
            public PresignedUrlResponse getPresignedUploadUrl(PresignedUrlRequest req) {
                throw new ServiceUnavailableException("asset-service");
            }
            @Override
            public void deleteAsset(String assetId) {
                log.warn("AssetService delete fallback for {}: {}", assetId, cause.getMessage());
            }
        };
    }
}

// Configuración global de Feign
@Configuration
public class FeignConfig {
    
    @Bean
    public RequestInterceptor authInterceptor() {
        // Propagar el JWT del request actual a los servicios downstream
        return template -> {
            ServletRequestAttributes attrs = (ServletRequestAttributes) 
                RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                String auth = attrs.getRequest().getHeader("Authorization");
                if (auth != null) {
                    template.header("Authorization", auth);
                }
                // Propagar correlation ID para trazabilidad
                String correlationId = attrs.getRequest().getHeader("X-Correlation-Id");
                if (correlationId != null) {
                    template.header("X-Correlation-Id", correlationId);
                }
            }
        };
    }

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean
    public Retryer feignRetryer() {
        return new Retryer.Default(100, 500, 3);
    }
}
```

---

### 8.2 Kafka — Event-Driven Architecture

#### Topics y Contratos de Eventos

```
Topic: sdoc.users.registered
  Partitions: 3
  Replication Factor: 3 (producción)
  Retention: 7 días
  Schema: UserRegisteredEvent

Topic: sdoc.documents.created
  Partitions: 6  (mayor throughput)
  Retention: 30 días
  Schema: DocumentCreatedEvent

Topic: sdoc.documents.updated
  Partitions: 6
  Retention: 7 días
  Schema: DocumentUpdatedEvent

Topic: sdoc.documents.deleted
  Partitions: 3
  Retention: 30 días
  Schema: DocumentDeletedEvent

Topic: sdoc.exports.requested
  Partitions: 3
  Retention: 24 horas
  Schema: ExportRequestedEvent

Topic: sdoc.notifications.send
  Partitions: 3
  Retention: 24 horas
  Schema: NotificationEvent

Topic: sdoc.sync.operations
  Partitions: 12  (alto volumen)
  Retention: 1 hora
  Schema: SyncOperationEvent

Topic: sdoc.versions.created
  Partitions: 3
  Retention: 30 días
  Schema: VersionCreatedEvent

Topic: sdoc.billing.events
  Partitions: 3
  Retention: 90 días
  Schema: BillingEvent

-- Dead Letter Queues (automáticas) --
Topic: sdoc.documents.created.dlq
Topic: sdoc.exports.requested.dlq
Topic: sdoc.notifications.send.dlq
```

#### Eventos — Esquemas Java

```java
// shared/java-commons/src/main/java/app/sdoc/commons/events/

// UserRegisteredEvent.java
public record UserRegisteredEvent(
    @NotNull UUID userId,
    @NotNull @Email String email,
    @NotNull String fullName,
    @NotNull Instant occurredAt
) implements DomainEvent {
    public static final String TOPIC = "sdoc.users.registered";
}

// DocumentCreatedEvent.java
public record DocumentCreatedEvent(
    @NotNull UUID documentId,
    @NotNull UUID ownerId,
    @NotNull String title,
    @NotNull String language,
    @NotNull Instant occurredAt
) implements DomainEvent {
    public static final String TOPIC = "sdoc.documents.created";
    
    public static DocumentCreatedEvent from(Document doc, String userId) {
        return new DocumentCreatedEvent(
            doc.getId(), UUID.fromString(userId), doc.getTitle(),
            doc.getLanguage(), Instant.now()
        );
    }
}

// ExportRequestedEvent.java
public record ExportRequestedEvent(
    @NotNull UUID jobId,
    @NotNull UUID documentId,
    @NotNull UUID requestedBy,
    @NotNull ExportFormat format,
    Map<String, Object> options,
    @NotNull Instant occurredAt
) implements DomainEvent {
    public static final String TOPIC = "sdoc.exports.requested";
}
```

#### Kafka Consumer — notification-service

```java
// services/notification-service/src/main/java/app/sdoc/notification/kafka/

@Component
@Slf4j
public class DocumentEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(
        topics = "sdoc.documents.created",
        groupId = "notification-service-group",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void onDocumentCreated(
        @Payload DocumentCreatedEvent event,
        @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
        @Header(KafkaHeaders.OFFSET) long offset,
        Acknowledgment ack
    ) {
        try {
            log.info("Processing DocumentCreated event: docId={} offset={}", 
                event.documentId(), offset);
            
            notificationService.sendWelcomeEmail(event.ownerId(), event.title());
            
            ack.acknowledge(); // Manual ack — solo después de procesar exitosamente
            
        } catch (Exception ex) {
            log.error("Failed to process DocumentCreated event at offset {}: {}", offset, ex.getMessage());
            // NO hacer ack — Kafka reintentará según la política configurada
            // Después de maxRetries, irá al DLQ
        }
    }

    @KafkaListener(
        topics = "sdoc.users.registered",
        groupId = "notification-service-group"
    )
    public void onUserRegistered(@Payload UserRegisteredEvent event, Acknowledgment ack) {
        try {
            notificationService.sendRegistrationEmail(event.email(), event.fullName());
            ack.acknowledge();
        } catch (Exception ex) {
            log.error("Failed to send registration email to {}: {}", event.email(), ex.getMessage());
        }
    }
}

// DLQ Consumer — para monitorear y reprocesar mensajes fallidos
@Component
@Slf4j
public class DlqConsumer {

    @KafkaListener(
        topics = {"sdoc.documents.created.dlq", "sdoc.exports.requested.dlq"},
        groupId = "dlq-monitor-group"
    )
    public void onDlqMessage(ConsumerRecord<String, String> record) {
        log.error("DLQ message received - topic: {}, partition: {}, offset: {}, key: {}, value: {}",
            record.topic(), record.partition(), record.offset(), 
            record.key(), record.value()
        );
        // Alertar via Slack/PagerDuty — un mensaje en DLQ es un error que necesita atención
        // alertingService.sendDlqAlert(record);
    }
}
```

#### KafkaConfig.java — Configuración completa con DLQ

```java
@Configuration
@EnableKafka
public class KafkaConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
        ConsumerFactory<String, Object> consumerFactory,
        KafkaTemplate<String, Object> kafkaTemplate
    ) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        factory.setConcurrency(3);  // 3 threads de consumo
        
        // Dead Letter Queue — después de 3 reintentos, enviar al DLQ
        factory.setCommonErrorHandler(new DefaultErrorHandler(
            new DeadLetterPublishingRecoverer(kafkaTemplate, 
                (record, ex) -> new TopicPartition(record.topic() + ".dlq", -1)
            ),
            new FixedBackOff(1000L, 3L)  // 3 reintentos con 1s de espera
        ));

        return factory;
    }

    @Bean
    public KafkaAdmin.NewTopics createTopics() {
        return new KafkaAdmin.NewTopics(
            TopicBuilder.name("sdoc.users.registered").partitions(3).replicas(1).build(),
            TopicBuilder.name("sdoc.documents.created").partitions(6).replicas(1).build(),
            TopicBuilder.name("sdoc.documents.updated").partitions(6).replicas(1).build(),
            TopicBuilder.name("sdoc.documents.deleted").partitions(3).replicas(1).build(),
            TopicBuilder.name("sdoc.exports.requested").partitions(3).replicas(1).build(),
            TopicBuilder.name("sdoc.notifications.send").partitions(3).replicas(1).build(),
            TopicBuilder.name("sdoc.sync.operations").partitions(12).replicas(1).build(),
            TopicBuilder.name("sdoc.versions.created").partitions(3).replicas(1).build(),
            TopicBuilder.name("sdoc.billing.events").partitions(3).replicas(1).build(),
            // DLQs
            TopicBuilder.name("sdoc.documents.created.dlq").partitions(1).replicas(1).build(),
            TopicBuilder.name("sdoc.exports.requested.dlq").partitions(1).replicas(1).build(),
            TopicBuilder.name("sdoc.notifications.send.dlq").partitions(1).replicas(1).build()
        );
    }
}
```

---

### 8.3 Saga Pattern — Transacciones Distribuidas

Para operaciones que involucran múltiples servicios (ej: exportar un documento), usamos el patrón **Choreography-based Saga**.

```
SAGA: ExportDocument

Paso 1: document-service publica ExportRequestedEvent
         ↓
Paso 2: render-service consume ExportRequestedEvent
        → Procesa la exportación (puede tardar 30-60s)
        → Si OK: publica ExportCompletedEvent
        → Si falla: publica ExportFailedEvent
         ↓
Paso 3: document-service consume ExportCompletedEvent/ExportFailedEvent
        → Actualiza estado del job en PostgreSQL
         ↓
Paso 4: notification-service consume ExportCompletedEvent
        → Envía email al usuario con link de descarga
         ↓
Paso 5: version-service consume ExportCompletedEvent
        → Registra que se exportó (para auditoría)
```

```java
// En render-service: Kafka consumer para procesar exports

@Component
@Slf4j
public class ExportRequestConsumer {

    private final RenderService renderService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final MinioStorageService storageService;

    @KafkaListener(
        topics = "sdoc.exports.requested",
        groupId = "render-service-group"
    )
    @Transactional
    public void onExportRequested(
        @Payload ExportRequestedEvent event,
        Acknowledgment ack
    ) {
        log.info("Processing export job: {} format={}", event.jobId(), event.format());

        try {
            // 1. Obtener contenido del documento
            DocumentContent content = fetchDocumentContent(event.documentId());
            
            // 2. Renderizar según formato
            byte[] rendered = renderService.render(content, event.format(), event.options());
            
            // 3. Subir a MinIO/S3
            String storageKey = "exports/" + event.documentId() + "/" + event.jobId() 
                + "." + event.format().extension();
            storageService.upload(storageKey, rendered, event.format().contentType());
            
            // 4. Publicar éxito — otros servicios reaccionan
            kafkaTemplate.send("sdoc.exports.completed",
                event.jobId().toString(),
                new ExportCompletedEvent(
                    event.jobId(), event.documentId(), event.requestedBy(),
                    storageKey, rendered.length, event.format(), Instant.now()
                )
            );

            ack.acknowledge();
            log.info("Export completed: job={} size={}bytes", event.jobId(), rendered.length);

        } catch (Exception ex) {
            log.error("Export failed: job={} error={}", event.jobId(), ex.getMessage());
            
            // Publicar fallo — compensating transaction
            kafkaTemplate.send("sdoc.exports.failed",
                event.jobId().toString(),
                new ExportFailedEvent(
                    event.jobId(), event.documentId(), event.requestedBy(),
                    ex.getMessage(), Instant.now()
                )
            );
            
            ack.acknowledge(); // Ack para no reintentarlo (el error fue intencionalmente publicado)
        }
    }
}
```

---

## 9. SEGURIDAD ENTERPRISE

### 9.1 HashiCorp Vault — Gestión de Secretos

**REGLA:** NINGÚN secreto (contraseñas, API keys, claves de cifrado) se almacena en variables de entorno en producción. TODO va a Vault.

#### Inicialización de Vault

```bash
# infrastructure/vault/init.sh

# 1. Inicializar Vault (primera vez)
vault operator init -key-shares=5 -key-threshold=3 \
  -format=json > /opt/sdoc/vault-init.json

# GUARDAR los unseal keys y root token en lugar SEGURO (ej: AWS Secrets Manager)

# 2. Unseal Vault (necesita 3 de 5 keys)
vault operator unseal <KEY_1>
vault operator unseal <KEY_2>
vault operator unseal <KEY_3>

# 3. Configurar secret engine KV v2
vault secrets enable -path=secret kv-v2

# 4. Crear secretos de la plataforma
vault kv put secret/sdoc/database \
  url="jdbc:postgresql://postgres:5432/sdoc_db" \
  username="sdoc" \
  password="$(openssl rand -base64 32)"

vault kv put secret/sdoc/redis \
  password="$(openssl rand -base64 32)"

vault kv put secret/sdoc/minio \
  access-key="$(openssl rand -hex 16)" \
  secret-key="$(openssl rand -base64 40)"

vault kv put secret/sdoc/keycloak \
  admin-password="$(openssl rand -base64 24)" \
  client-secret="$(openssl rand -base64 32)"

vault kv put secret/sdoc/jwt \
  secret="$(openssl rand -base64 64)"

vault kv put secret/sdoc/encryption \
  master-key="$(openssl rand -base64 32)" \
  hkdf-salt="$(openssl rand -base64 32)"

vault kv put secret/sdoc/stripe \
  secret-key="sk_live_XXXX" \
  webhook-secret="whsec_XXXX"

vault kv put secret/sdoc/email \
  resend-api-key="re_XXXX"

# 5. Configurar PKI para mTLS
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki
vault write pki/root/generate/internal \
  common_name="sdoc-internal-ca" \
  ttl=87600h

vault write pki/roles/sdoc-service \
  allowed_domains="sdoc.internal" \
  allow_subdomains=true \
  max_ttl=720h

# 6. Crear políticas de acceso por servicio
vault policy write document-service - << 'POLICY'
path "secret/data/sdoc/database" { capabilities = ["read"] }
path "secret/data/sdoc/redis" { capabilities = ["read"] }
path "secret/data/sdoc/minio" { capabilities = ["read"] }
path "secret/data/sdoc/encryption" { capabilities = ["read"] }
path "pki/issue/sdoc-service" { capabilities = ["create", "update"] }
POLICY

vault policy write auth-service - << 'POLICY'
path "secret/data/sdoc/database" { capabilities = ["read"] }
path "secret/data/sdoc/keycloak" { capabilities = ["read"] }
path "secret/data/sdoc/jwt" { capabilities = ["read"] }
path "secret/data/sdoc/stripe" { capabilities = ["read"] }
path "pki/issue/sdoc-service" { capabilities = ["create", "update"] }
POLICY

# 7. AppRole auth para servicios (en K8s: usar Kubernetes auth)
vault auth enable approle
vault write auth/approle/role/document-service \
  token_policies="document-service" \
  token_ttl=1h \
  token_max_ttl=4h
```

#### Integración Spring Boot + Vault

```yaml
# Agregar a bootstrap.yml de cada servicio
spring:
  cloud:
    vault:
      host: ${VAULT_HOST:vault}
      port: 8200
      scheme: http
      authentication: APPROLE
      app-role:
        role-id: ${VAULT_ROLE_ID}      # En K8s: desde K8s secret
        secret-id: ${VAULT_SECRET_ID}  # En K8s: desde K8s secret
      kv:
        enabled: true
        default-context: sdoc
        application-name: ${spring.application.name}
        backend: secret
      pki:
        enabled: true   # Para obtener certificados mTLS automáticamente
        role: sdoc-service
        backend: pki
```

Con esta configuración, Spring Boot **automáticamente** inyecta los secretos de Vault como properties:

```yaml
# Esto en config-repo/application.yml referencia Vault automáticamente:
spring:
  datasource:
    password: ${vault:secret/sdoc/database#password}
  data:
    redis:
      password: ${vault:secret/sdoc/redis#password}
```

---

### 9.2 mTLS entre Microservicios

Mutual TLS garantiza que SOLO servicios legítimos de SDOC pueden comunicarse entre sí.

**En desarrollo (Docker Compose):** certificados auto-firmados generados por script.  
**En producción (K8s):** Istio service mesh maneja mTLS automáticamente.

```bash
# scripts/generate-certs.sh — Desarrollo local
#!/bin/bash

CERTS_DIR="infrastructure/docker/certs"
mkdir -p $CERTS_DIR

# 1. CA interna
openssl genrsa -out $CERTS_DIR/ca.key 4096
openssl req -new -x509 -days 3650 -key $CERTS_DIR/ca.key \
  -out $CERTS_DIR/ca.crt \
  -subj "/CN=SDOC Internal CA/O=SDOC/C=CO"

# 2. Certificado por servicio
for SERVICE in api-gateway auth-service document-service sync-service asset-service version-service render-service; do
  openssl genrsa -out $CERTS_DIR/$SERVICE.key 2048
  openssl req -new -key $CERTS_DIR/$SERVICE.key \
    -out $CERTS_DIR/$SERVICE.csr \
    -subj "/CN=$SERVICE.sdoc.internal/O=SDOC/C=CO"
  openssl x509 -req -days 365 \
    -in $CERTS_DIR/$SERVICE.csr \
    -CA $CERTS_DIR/ca.crt \
    -CAkey $CERTS_DIR/ca.key \
    -CAcreateserial \
    -out $CERTS_DIR/$SERVICE.crt
  echo "Generated cert for $SERVICE"
done

echo "Certificates generated in $CERTS_DIR"
```

```java
// Configuración mTLS en Feign Client
@Configuration
public class MtlsFeignConfig {

    @Bean
    public Client mtlsFeignClient() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(
            new FileInputStream(sslProperties.getKeyStorePath()),
            sslProperties.getKeyStorePassword().toCharArray()
        );

        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(keyStore, sslProperties.getKeyStorePassword().toCharArray());

        KeyStore trustStore = KeyStore.getInstance("PKCS12");
        trustStore.load(
            new FileInputStream(sslProperties.getTrustStorePath()),
            sslProperties.getTrustStorePassword().toCharArray()
        );

        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(trustStore);

        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);

        return new Client.Default(
            sslContext.getSocketFactory(),
            (hostname, session) -> hostname.endsWith(".sdoc.internal")
        );
    }
}
```

---

### 9.3 Cifrado de Documentos — AES-256-GCM + HKDF

```java
// services/document-service/src/main/java/app/sdoc/document/security/DocumentEncryptionService.java
@Service
@Slf4j
public class DocumentEncryptionService {

    private static final String CIPHER_ALGORITHM = "AES/GCM/NoPadding";
    private static final int KEY_SIZE_BITS = 256;
    private static final int IV_SIZE_BYTES = 12;     // 96 bits — recomendado para GCM
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String HKDF_HASH = "HmacSHA256";

    @Value("${sdoc.encryption.master-key}")  // Inyectado desde Vault
    private String masterKeyBase64;

    @Value("${sdoc.encryption.hkdf-salt}")   // Inyectado desde Vault
    private String hkdfSaltBase64;

    // ---- CIFRAR ----
    public EncryptedContent encrypt(byte[] plaintext, UUID documentId) throws Exception {
        byte[] iv = generateSecureRandom(IV_SIZE_BYTES);
        SecretKey key = deriveDocumentKey(documentId, iv);

        Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        
        // AAD: Additional Authenticated Data — vincula el ciphertext al documentId
        // Previene ataques de sustitución de documentos
        cipher.updateAAD(documentId.toString().getBytes(StandardCharsets.UTF_8));
        
        byte[] ciphertext = cipher.doFinal(plaintext);

        return new EncryptedContent(
            Base64.getEncoder().encodeToString(ciphertext),
            Base64.getEncoder().encodeToString(iv),
            "AES-256-GCM",
            calculateSHA256(plaintext)  // Checksum del plaintext para verificación
        );
    }

    // ---- DESCIFRAR ----
    public byte[] decrypt(EncryptedContent encrypted, UUID documentId) throws Exception {
        byte[] iv = Base64.getDecoder().decode(encrypted.iv());
        byte[] ciphertext = Base64.getDecoder().decode(encrypted.ciphertext());
        SecretKey key = deriveDocumentKey(documentId, iv);

        Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        cipher.updateAAD(documentId.toString().getBytes(StandardCharsets.UTF_8));

        byte[] plaintext = cipher.doFinal(ciphertext);

        // Verificar integridad
        String computedChecksum = calculateSHA256(plaintext);
        if (!computedChecksum.equals(encrypted.plaintextChecksum())) {
            throw new DocumentIntegrityException("Checksum mismatch for document " + documentId);
        }

        return plaintext;
    }

    // ---- DERIVACIÓN DE CLAVE (HKDF) ----
    // Una clave única por documento — compromiso de una clave no compromete otras
    private SecretKey deriveDocumentKey(UUID documentId, byte[] iv) throws Exception {
        byte[] masterKey = Base64.getDecoder().decode(masterKeyBase64);
        byte[] salt = Base64.getDecoder().decode(hkdfSaltBase64);
        
        // Info = "sdoc-v1:document:" + documentId + ":" + hex(iv)
        // Binding del IV a la derivación previene reutilización de IV
        String infoStr = "sdoc-v1:document:" + documentId + ":" + HexFormat.of().formatHex(iv);
        byte[] info = infoStr.getBytes(StandardCharsets.UTF_8);

        // HKDF Extract
        Mac mac = Mac.getInstance(HKDF_HASH);
        mac.init(new SecretKeySpec(salt, HKDF_HASH));
        byte[] prk = mac.doFinal(masterKey);

        // HKDF Expand
        mac.init(new SecretKeySpec(prk, HKDF_HASH));
        byte[] t = new byte[0];
        byte[] okm = new byte[KEY_SIZE_BITS / 8];
        int generatedBytes = 0;
        int blockNumber = 1;

        while (generatedBytes < okm.length) {
            mac.update(t);
            mac.update(info);
            mac.update((byte) blockNumber);
            t = mac.doFinal();
            int toCopy = Math.min(t.length, okm.length - generatedBytes);
            System.arraycopy(t, 0, okm, generatedBytes, toCopy);
            generatedBytes += toCopy;
            blockNumber++;
        }

        return new SecretKeySpec(okm, "AES");
    }

    // ---- FIRMA ED25519 ----
    public String signDocument(byte[] content, String privateKeyBase64) throws Exception {
        byte[] privateKeyBytes = Base64.getDecoder().decode(privateKeyBase64);
        PrivateKey privateKey = KeyFactory.getInstance("Ed25519")
            .generatePrivate(new PKCS8EncodedKeySpec(privateKeyBytes));
        
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(privateKey);
        signer.update(content);
        
        return Base64.getEncoder().encodeToString(signer.sign());
    }

    // ---- VERIFICAR FIRMA ----
    public boolean verifySignature(byte[] content, String signatureBase64, String publicKeyBase64) {
        try {
            byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyBase64);
            PublicKey publicKey = KeyFactory.getInstance("Ed25519")
                .generatePublic(new X509EncodedKeySpec(publicKeyBytes));
            
            Signature verifier = Signature.getInstance("Ed25519");
            verifier.initVerify(publicKey);
            verifier.update(content);
            
            return verifier.verify(Base64.getDecoder().decode(signatureBase64));
        } catch (Exception ex) {
            log.error("Signature verification failed: {}", ex.getMessage());
            return false;
        }
    }

    public String calculateSHA256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private byte[] generateSecureRandom(int bytes) {
        byte[] random = new byte[bytes];
        new SecureRandom().nextBytes(random);
        return random;
    }
}
```

---

### 9.4 OPA — Políticas de Autorización

```rego
# infrastructure/opa/policies/documents.rego
package sdoc.documents

import rego.v1

# ============================================================
# REGLAS DE ACCESO A DOCUMENTOS
# ============================================================

default allow := false

# El propietario puede hacer TODO
allow if {
    input.user.id == input.document.owner_id
}

# Verificar permisos granulares para colaboradores
allow if {
    permission := data.permissions[input.document.id][input.user.id]
    action_permitted(input.action, permission)
}

# Documentos públicos — lectura anónima
allow if {
    input.action == "read"
    input.document.is_public == true
}

# Compartir por token con expiración
allow if {
    input.action in {"read", "comment"}
    input.document.share_token != ""
    input.document.share_token == input.share_token
    not token_expired(input.document.share_expires_at)
}

# Administradores de organización
allow if {
    input.document.organization_id != ""
    org_member := data.org_members[input.document.organization_id][input.user.id]
    org_member.role in {"OWNER", "ADMIN"}
}

# ============================================================
# HELPERS
# ============================================================

action_permitted(action, permission) if {
    action == "read"
    permission.can_read == true
}
action_permitted(action, permission) if {
    action == "edit"
    permission.can_edit == true
}
action_permitted(action, permission) if {
    action == "comment"
    permission.can_comment == true
}
action_permitted(action, permission) if {
    action == "export"
    permission.can_export == true
}
action_permitted(action, permission) if {
    action == "share"
    permission.can_share == true
}
action_permitted(action, permission) if {
    action == "delete"
    permission.can_delete == true
}

token_expired(expires_at) if {
    expires_at != null
    time.now_ns() > time.parse_rfc3339_ns(expires_at)
}

# ============================================================
# PLAN LIMITS POLICY
# ============================================================
package sdoc.limits

default can_create_document := false

can_create_document if {
    input.user.plan == "PRO"
}

can_create_document if {
    input.user.plan == "ENTERPRISE"
}

can_create_document if {
    input.user.plan == "FREE"
    input.current_document_count < 10
}

default can_export := false

can_export if {
    input.user.plan in {"PRO", "ENTERPRISE"}
}

can_export if {
    input.user.plan == "FREE"
    input.monthly_export_count < 5
}
```

```java
// OPA Client en Java
@Component
public class OpaClient {

    private final WebClient webClient;

    public OpaClient(@Value("${opa.url:http://opa:8181}") String opaUrl) {
        this.webClient = WebClient.builder().baseUrl(opaUrl).build();
    }

    public void enforce(OpaInput input) {
        Boolean allowed = webClient.post()
            .uri("/v1/data/sdoc/documents/allow")
            .bodyValue(Map.of("input", input))
            .retrieve()
            .bodyToMono(OpaResponse.class)
            .map(OpaResponse::result)
            .block(Duration.ofSeconds(2));
        
        if (!Boolean.TRUE.equals(allowed)) {
            throw new AccessDeniedException("Acción '" + input.action() + "' no permitida");
        }
    }
}
```

---

## 10. INFRAESTRUCTURA DOCKER COMPOSE COMPLETA

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.9'

networks:
  sdoc-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
  redis_data:
  minio_data:
  keycloak_data:
  vault_data:
  kafka_data:
  zookeeper_data:
  prometheus_data:
  grafana_data:
  loki_data:

x-java-service: &java-service
  restart: unless-stopped
  networks:
    - sdoc-network
  depends_on:
    postgres: { condition: service_healthy }
    redis: { condition: service_healthy }
    kafka: { condition: service_healthy }
    vault: { condition: service_healthy }
    eureka: { condition: service_healthy }
    config-server: { condition: service_healthy }
  environment:
    SPRING_PROFILES_ACTIVE: docker
    VAULT_HOST: vault
    VAULT_PORT: 8200
    CONFIG_SERVER_URI: http://config-server:8888
    CONFIG_SERVER_USER: config-admin
    CONFIG_SERVER_PASSWORD: ${CONFIG_SERVER_PASSWORD}
    EUREKA_URL: http://eureka-admin:${EUREKA_PASSWORD}@eureka:8761/eureka/
    KAFKA_BROKERS: kafka:9092
    POSTGRES_HOST: postgres
    REDIS_HOST: redis
    OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318
    OTEL_SERVICE_NAME: ${SERVICE_NAME}
    OTEL_TRACES_SAMPLER: always_on

services:

  # ============================================================
  # ZOOKEEPER + KAFKA
  # ============================================================
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: sdoc-zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
    networks:
      - sdoc-network
    healthcheck:
      test: nc -z localhost 2181 || exit -1
      interval: 10s
      timeout: 5s
      retries: 10

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: sdoc-kafka
    restart: unless-stopped
    depends_on:
      zookeeper: { condition: service_healthy }
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'  # Controlamos topics manualmente
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - kafka_data:/var/lib/kafka/data
    ports:
      - "29092:29092"  # Acceso externo para desarrollo
    networks:
      - sdoc-network
    healthcheck:
      test: kafka-broker-api-versions --bootstrap-server localhost:9092
      interval: 15s
      timeout: 10s
      retries: 10

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: sdoc-kafka-ui
    restart: unless-stopped
    depends_on:
      kafka: { condition: service_healthy }
    environment:
      KAFKA_CLUSTERS_0_NAME: sdoc-local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    ports:
      - "8089:8080"
    networks:
      - sdoc-network

  # ============================================================
  # POSTGRESQL
  # ============================================================
  postgres:
    image: postgres:16-alpine
    container_name: sdoc-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-sdoc}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-sdoc_db}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_CO.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/db/init.sql:/docker-entrypoint-initdb.d/001-init.sql
    ports:
      - "5432:5432"
    networks:
      - sdoc-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-sdoc} -d ${POSTGRES_DB:-sdoc_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
        -c max_connections=200
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c maintenance_work_mem=64MB
        -c checkpoint_completion_target=0.9
        -c wal_buffers=16MB
        -c default_statistics_target=100
        -c log_min_duration_statement=500
        -c log_checkpoints=on

  # ============================================================
  # REDIS
  # ============================================================
  redis:
    image: redis:7.2-alpine
    container_name: sdoc-redis
    restart: unless-stopped
    command: >
      redis-server
        --requirepass ${REDIS_PASSWORD}
        --maxmemory 512mb
        --maxmemory-policy allkeys-lru
        --save 900 1
        --save 300 10
        --save 60 10000
        --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - sdoc-network
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================================
  # MINIO (Object Storage)
  # ============================================================
  minio:
    image: minio/minio:RELEASE.2024-01-16T16-07-38Z
    container_name: sdoc-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_SITE_REGION: us-east-1
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - sdoc-network
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 5

  minio-init:
    image: minio/mc:latest
    container_name: sdoc-minio-init
    depends_on:
      minio: { condition: service_healthy }
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} &&
      mc mb -p local/sdoc-documents &&
      mc mb -p local/sdoc-assets &&
      mc mb -p local/sdoc-versions &&
      mc mb -p local/sdoc-exports &&
      mc policy set download local/sdoc-exports &&
      echo 'MinIO buckets initialized'
      "
    networks:
      - sdoc-network

  # ============================================================
  # HASHICORP VAULT
  # ============================================================
  vault:
    image: hashicorp/vault:1.16
    container_name: sdoc-vault
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_DEV_TOKEN:-dev-root-token}
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
      VAULT_ADDR: http://127.0.0.1:8200
    command: vault server -dev
    volumes:
      - vault_data:/vault/data
      - ./vault/config:/vault/config
    ports:
      - "8200:8200"
    networks:
      - sdoc-network
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 10s
      timeout: 5s
      retries: 10

  vault-init:
    image: hashicorp/vault:1.16
    container_name: sdoc-vault-init
    depends_on:
      vault: { condition: service_healthy }
    environment:
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_DEV_TOKEN:-dev-root-token}
    volumes:
      - ./scripts/vault-init.sh:/vault-init.sh
    command: sh /vault-init.sh
    networks:
      - sdoc-network

  # ============================================================
  # KEYCLOAK
  # ============================================================
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: sdoc-keycloak
    restart: unless-stopped
    command: start-dev --import-realm
    environment:
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-sdoc_db}
      KC_DB_USERNAME: ${POSTGRES_USER:-sdoc}
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_DB_SCHEMA: keycloak
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8090
      KC_LOG_LEVEL: INFO
    volumes:
      - keycloak_data:/opt/keycloak/data
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm.json
    ports:
      - "8090:8080"
    networks:
      - sdoc-network
    depends_on:
      postgres: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/8080; echo -e 'GET /health/ready HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3; grep -q 'UP' <&3"]
      interval: 30s
      timeout: 10s
      retries: 15
      start_period: 60s

  # ============================================================
  # OPA (Open Policy Agent)
  # ============================================================
  opa:
    image: openpolicyagent/opa:0.65.0
    container_name: sdoc-opa
    restart: unless-stopped
    command: run --server --addr 0.0.0.0:8181 /policies
    volumes:
      - ./opa/policies:/policies
    ports:
      - "8181:8181"
    networks:
      - sdoc-network

  # ============================================================
  # SPRING CLOUD INFRASTRUCTURE
  # ============================================================
  config-server:
    build:
      context: ../../services/config-server
      dockerfile: Dockerfile
    container_name: sdoc-config-server
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: docker
      CONFIG_REPO_URI: file:///config-repo
      CONFIG_SERVER_PASSWORD: ${CONFIG_SERVER_PASSWORD}
      CONFIG_ENCRYPT_KEY: ${CONFIG_ENCRYPT_KEY}
      VAULT_HOST: vault
      VAULT_TOKEN: ${VAULT_DEV_TOKEN:-dev-root-token}
      EUREKA_URL: http://eureka-admin:${EUREKA_PASSWORD}@eureka:8761/eureka/
    volumes:
      - ../../config-repo:/config-repo:ro
    ports:
      - "8888:8888"
    networks:
      - sdoc-network
    depends_on:
      vault: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8888/actuator/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 30s

  eureka:
    build:
      context: ../../services/eureka-server
      dockerfile: Dockerfile
    container_name: sdoc-eureka
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: docker
      EUREKA_PASSWORD: ${EUREKA_PASSWORD}
      EUREKA_HOSTNAME: eureka
    ports:
      - "8761:8761"
    networks:
      - sdoc-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8761/actuator/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 20s

  api-gateway:
    <<: *java-service
    build:
      context: ../../services/api-gateway
    container_name: sdoc-api-gateway
    environment:
      SERVICE_NAME: api-gateway
      VAULT_ROLE_ID: ${GATEWAY_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${GATEWAY_VAULT_SECRET_ID}
    ports:
      - "8080:8080"

  auth-service:
    <<: *java-service
    build:
      context: ../../services/auth-service
    container_name: sdoc-auth-service
    environment:
      SERVICE_NAME: auth-service
      VAULT_ROLE_ID: ${AUTH_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${AUTH_VAULT_SECRET_ID}
    ports:
      - "8081:8081"

  document-service:
    <<: *java-service
    build:
      context: ../../services/document-service
    container_name: sdoc-document-service
    environment:
      SERVICE_NAME: document-service
      VAULT_ROLE_ID: ${DOCUMENT_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${DOCUMENT_VAULT_SECRET_ID}
    ports:
      - "8082:8082"

  sync-service:
    <<: *java-service
    build:
      context: ../../services/sync-service
    container_name: sdoc-sync-service
    environment:
      SERVICE_NAME: sync-service
      VAULT_ROLE_ID: ${SYNC_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${SYNC_VAULT_SECRET_ID}
    ports:
      - "8085:8085"

  asset-service:
    <<: *java-service
    build:
      context: ../../services/asset-service
    container_name: sdoc-asset-service
    environment:
      SERVICE_NAME: asset-service
      VAULT_ROLE_ID: ${ASSET_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${ASSET_VAULT_SECRET_ID}
    ports:
      - "8083:8083"

  version-service:
    <<: *java-service
    build:
      context: ../../services/version-service
    container_name: sdoc-version-service
    environment:
      SERVICE_NAME: version-service
      VAULT_ROLE_ID: ${VERSION_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${VERSION_VAULT_SECRET_ID}
    ports:
      - "8084:8084"

  notification-service:
    <<: *java-service
    build:
      context: ../../services/notification-service
    container_name: sdoc-notification-service
    environment:
      SERVICE_NAME: notification-service
      VAULT_ROLE_ID: ${NOTIFICATION_VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${NOTIFICATION_VAULT_SECRET_ID}
    ports:
      - "8087:8087"

  # ============================================================
  # RENDER SERVICE (Python)
  # ============================================================
  render-service:
    build:
      context: ../../services/render-service
      dockerfile: Dockerfile
    container_name: sdoc-render-service
    restart: unless-stopped
    environment:
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_DEV_TOKEN:-dev-root-token}
      EUREKA_URL: http://eureka:8761/eureka/
      KAFKA_BROKERS: kafka:9092
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
      CELERY_BROKER_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      CELERY_RESULT_BACKEND: redis://:${REDIS_PASSWORD}@redis:6379/2
    ports:
      - "8086:8086"
    networks:
      - sdoc-network
    depends_on:
      redis: { condition: service_healthy }
      kafka: { condition: service_healthy }
      vault: { condition: service_healthy }

  render-worker:
    build:
      context: ../../services/render-service
      dockerfile: Dockerfile.worker
    container_name: sdoc-render-worker
    restart: unless-stopped
    command: celery -A app.worker worker --loglevel=info --concurrency=4 -Q render,import,preview
    environment:
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_DEV_TOKEN:-dev-root-token}
      CELERY_BROKER_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      CELERY_RESULT_BACKEND: redis://:${REDIS_PASSWORD}@redis:6379/2
    networks:
      - sdoc-network
    depends_on:
      redis: { condition: service_healthy }

  render-flower:
    image: mher/flower:2.0
    container_name: sdoc-render-flower
    restart: unless-stopped
    environment:
      CELERY_BROKER_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
    ports:
      - "5555:5555"
    networks:
      - sdoc-network

  # ============================================================
  # FRONTEND
  # ============================================================
  web:
    build:
      context: ../../apps/web
      dockerfile: Dockerfile
      target: development
    container_name: sdoc-web
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:8080
      VITE_WS_URL: ws://localhost:8085
      VITE_KEYCLOAK_URL: http://localhost:8090
      VITE_KEYCLOAK_REALM: sdoc
      VITE_KEYCLOAK_CLIENT_ID: sdoc-web
    ports:
      - "3000:3000"
    networks:
      - sdoc-network
    volumes:
      - ../../apps/web:/app
      - /app/node_modules

  # ============================================================
  # OBSERVABILIDAD
  # ============================================================
  prometheus:
    image: prom/prometheus:v2.52.0
    container_name: sdoc-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/rules/:/etc/prometheus/rules/:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - sdoc-network

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: sdoc-alertmanager
    restart: unless-stopped
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    ports:
      - "9093:9093"
    networks:
      - sdoc-network

  grafana:
    image: grafana/grafana:10.4.0
    container_name: sdoc-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-worldmap-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3001:3000"
    networks:
      - sdoc-network
    depends_on:
      - prometheus
      - loki

  loki:
    image: grafana/loki:2.9.6
    container_name: sdoc-loki
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - sdoc-network

  promtail:
    image: grafana/promtail:2.9.6
    container_name: sdoc-promtail
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - sdoc-network
    depends_on:
      - loki

  jaeger:
    image: jaegertracing/all-in-one:1.57
    container_name: sdoc-jaeger
    restart: unless-stopped
    environment:
      COLLECTOR_OTLP_ENABLED: true
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    networks:
      - sdoc-network
```

---

## 11. BASE DE DATOS Y ESQUEMAS

```sql
-- infrastructure/scripts/db/init.sql
-- Ejecutado automáticamente en el primer arranque

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema separado para Keycloak
CREATE SCHEMA IF NOT EXISTS keycloak;

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keycloak_id           VARCHAR(255) UNIQUE NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  username              VARCHAR(100) UNIQUE NOT NULL,
  full_name             VARCHAR(255),
  avatar_url            TEXT,
  plan                  VARCHAR(50) NOT NULL DEFAULT 'FREE'
                          CHECK (plan IN ('FREE', 'PRO', 'ENTERPRISE')),
  storage_used_bytes    BIGINT NOT NULL DEFAULT 0,
  storage_limit_bytes   BIGINT NOT NULL DEFAULT 1073741824,
  monthly_export_count  INTEGER NOT NULL DEFAULT 0,
  monthly_export_reset  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at         TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_keycloak ON users(keycloak_id);

-- ============================================================
-- ORGANIZACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  owner_id    UUID NOT NULL REFERENCES users(id),
  plan        VARCHAR(50) NOT NULL DEFAULT 'TEAM',
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(50) NOT NULL DEFAULT 'MEMBER'
                    CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
  invited_by      UUID REFERENCES users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- ============================================================
-- DOCUMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES users(id),
  organization_id       UUID REFERENCES organizations(id),
  title                 VARCHAR(500) NOT NULL DEFAULT 'Sin título',
  description           TEXT,
  content               JSONB NOT NULL DEFAULT '{"type":"document","pages":[]}',
  styles                JSONB NOT NULL DEFAULT '{}',
  manifest              JSONB NOT NULL DEFAULT '{}',
  status                VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED')),
  version               INTEGER NOT NULL DEFAULT 1,
  word_count            INTEGER NOT NULL DEFAULT 0,
  page_count            INTEGER NOT NULL DEFAULT 1,
  storage_key           VARCHAR(500),
  storage_size_bytes    BIGINT NOT NULL DEFAULT 0,
  content_checksum      VARCHAR(64),
  sync_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  crdt_state_key        VARCHAR(500),
  language              VARCHAR(10) NOT NULL DEFAULT 'es',
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  is_public             BOOLEAN NOT NULL DEFAULT FALSE,
  share_token           VARCHAR(255) UNIQUE,
  share_expires_at      TIMESTAMPTZ,
  is_encrypted          BOOLEAN NOT NULL DEFAULT FALSE,
  encryption_metadata   JSONB,
  search_vector         TSVECTOR,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_documents_owner ON documents(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_org ON documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_status ON documents(status, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_public ON documents(is_public) WHERE is_public = TRUE;

-- FTS trigger
CREATE OR REPLACE FUNCTION update_document_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('spanish',
    coalesce(unaccent(NEW.title), '') || ' ' ||
    coalesce(unaccent(NEW.description), '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_search
  BEFORE INSERT OR UPDATE OF title, description, tags ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();

-- ============================================================
-- PERMISOS
-- ============================================================
CREATE TABLE IF NOT EXISTS document_permissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  grantee_id   UUID NOT NULL REFERENCES users(id),
  can_read     BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit     BOOLEAN NOT NULL DEFAULT FALSE,
  can_comment  BOOLEAN NOT NULL DEFAULT FALSE,
  can_export   BOOLEAN NOT NULL DEFAULT FALSE,
  can_share    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete   BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by   UUID REFERENCES users(id),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, grantee_id)
);

CREATE INDEX idx_permissions_doc ON document_permissions(document_id);
CREATE INDEX idx_permissions_grantee ON document_permissions(grantee_id);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id       UUID REFERENCES documents(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES users(id),
  original_name     VARCHAR(500) NOT NULL,
  storage_key       VARCHAR(500) NOT NULL UNIQUE,
  content_type      VARCHAR(255) NOT NULL,
  size_bytes        BIGINT NOT NULL,
  width             INTEGER,
  height            INTEGER,
  duration_seconds  FLOAT,
  checksum_sha256   VARCHAR(64) NOT NULL,
  is_compressed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VERSIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  label           VARCHAR(255),
  snapshot_key    VARCHAR(500) NOT NULL,
  diff_from_prev  JSONB,
  word_count      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

CREATE INDEX idx_versions_doc ON document_versions(document_id, version_number DESC);

-- ============================================================
-- SESIONES DE COLABORACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  participant_ids  UUID[] NOT NULL DEFAULT '{}'
);

-- ============================================================
-- EXPORTACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_exports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id),
  format          VARCHAR(20) NOT NULL
                    CHECK (format IN ('PDF', 'DOCX', 'HTML', 'MARKDOWN', 'TXT', 'EPUB')),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  storage_key     VARCHAR(500),
  file_size_bytes BIGINT,
  error_message   TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ============================================================
-- AUDIT LOG (inmutable — append only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id        UUID,
  actor_email     VARCHAR(255),
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(50) NOT NULL,
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  details         JSONB,
  success         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, occurred_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, occurred_at DESC);

-- Prevenir UPDATE/DELETE en audit_log (solo INSERT permitido)
CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- SUSCRIPCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID REFERENCES users(id),
  organization_id          UUID REFERENCES organizations(id),
  plan                     VARCHAR(50) NOT NULL,
  status                   VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
                             CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING')),
  stripe_customer_id       VARCHAR(255),
  stripe_subscription_id   VARCHAR(255) UNIQUE,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  canceled_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 15. OBSERVABILIDAD ENTERPRISE

### Prometheus — prometheus.yml

```yaml
# infrastructure/docker/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'sdoc-local'
    environment: 'development'

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Spring Boot Actuator endpoints
  - job_name: 'spring-services'
    metrics_path: '/actuator/prometheus'
    eureka_sd_configs:
      - server: http://eureka-admin:${EUREKA_PASSWORD}@eureka:8761/eureka
    relabel_configs:
      - source_labels: [__meta_eureka_app_name]
        target_label: application
      - source_labels: [__meta_eureka_app_instance_ip_addr, __meta_eureka_app_instance_port_port]
        separator: ':'
        target_label: __address__

  - job_name: 'render-service'
    static_configs:
      - targets: ['render-service:8086']
    metrics_path: '/metrics'

  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka:9092']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Alertas Críticas

```yaml
# infrastructure/docker/monitoring/prometheus/rules/sdoc-alerts.yml
groups:
  - name: sdoc-critical
    rules:
      - alert: ServiceDown
        expr: up{job="spring-services"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Servicio SDOC caído: {{ $labels.application }}"
          description: "El servicio {{ $labels.application }} no está respondiendo."

      - alert: HighErrorRate
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Tasa de errores alta en {{ $labels.application }}"
          description: "Más del 5% de requests están fallando en {{ $labels.application }}."

      - alert: CircuitBreakerOpen
        expr: resilience4j_circuitbreaker_state{state="open"} == 1
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker abierto: {{ $labels.name }}"

      - alert: KafkaDLQMessages
        expr: kafka_consumer_fetch_manager_records_consumed_total{topic=~".*\\.dlq"} > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Mensajes en DLQ: {{ $labels.topic }}"
          description: "Hay mensajes fallidos en la Dead Letter Queue. Revisar inmediatamente."

      - alert: HighMemoryUsage
        expr: jvm_memory_used_bytes / jvm_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memoria alta en {{ $labels.application }}"

      - alert: DatabaseConnectionPoolExhausted
        expr: hikaricp_connections_active / hikaricp_connections_max > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Pool de conexiones DB casi agotado en {{ $labels.application }}"
```

---

## 16. CI/CD PIPELINE COMPLETO

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop, 'feature/**']
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  JAVA_VERSION: '21'
  PYTHON_VERSION: '3.12'
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository_owner }}/sdoc

jobs:

  # ============================================================
  # ANÁLISIS DE SEGURIDAD TEMPRANO
  # ============================================================
  security-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy (filesystem scan)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: CRITICAL,HIGH
          exit-code: 1  # Falla el CI si hay vulnerabilidades críticas
          format: sarif
          output: trivy-results.sarif
      
      - name: Upload Trivy SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif

      - name: Secret scanning (Gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================
  # TEST JAVA SERVICES
  # ============================================================
  test-java:
    runs-on: ubuntu-latest
    needs: security-analysis
    strategy:
      fail-fast: false
      matrix:
        service:
          - config-server
          - eureka-server
          - api-gateway
          - auth-service
          - document-service
          - sync-service
          - asset-service
          - version-service
          - notification-service
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK ${{ env.JAVA_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: temurin
          cache: gradle
      
      - name: Run tests with Testcontainers
        working-directory: services/${{ matrix.service }}
        run: ./gradlew test jacocoTestReport --no-daemon
        env:
          TESTCONTAINERS_RYUK_DISABLED: true
      
      - name: SonarQube Analysis
        working-directory: services/${{ matrix.service }}
        run: ./gradlew sonar --no-daemon
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: services/${{ matrix.service }}/build/reports/jacoco/test/jacocoTestReport.xml
          flags: ${{ matrix.service }}

  # ============================================================
  # TEST PYTHON SERVICE
  # ============================================================
  test-python:
    runs-on: ubuntu-latest
    needs: security-analysis
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python ${{ env.PYTHON_VERSION }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip
      
      - name: Install system deps
        run: sudo apt-get install -y tesseract-ocr poppler-utils pandoc
      
      - name: Install Python deps
        working-directory: services/render-service
        run: pip install -r requirements.txt -r requirements-dev.txt
      
      - name: Run pytest with coverage
        working-directory: services/render-service
        run: pytest --cov=app --cov-report=xml --cov-report=term -v
      
      - name: Lint (ruff)
        working-directory: services/render-service
        run: ruff check app/
      
      - name: Type check (mypy)
        working-directory: services/render-service
        run: mypy app/

  # ============================================================
  # TEST FRONTEND
  # ============================================================
  test-frontend:
    runs-on: ubuntu-latest
    needs: security-analysis
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      
      - run: npm ci
      - run: npm run type-check --workspace=apps/web
      - run: npm run lint --workspace=apps/web
      - run: npm run test:unit --workspace=apps/web
      
      - name: Build frontend (verify no errors)
        run: npm run build --workspace=apps/web
        env:
          VITE_API_URL: http://localhost:8080

  # ============================================================
  # INTEGRATION TESTS (Docker Compose)
  # ============================================================
  integration-tests:
    runs-on: ubuntu-latest
    needs: [test-java, test-python, test-frontend]
    if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Start test environment
        run: docker compose -f infrastructure/docker/docker-compose.test.yml up -d
        env:
          POSTGRES_PASSWORD: test_password
          REDIS_PASSWORD: test_redis_password
          VAULT_DEV_TOKEN: test-vault-token
      
      - name: Wait for services
        run: |
          timeout 120 bash -c 'until curl -sf http://localhost:8080/actuator/health; do sleep 3; done'
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests (Cypress)
        run: npm run test:e2e
        env:
          CYPRESS_BASE_URL: http://localhost:3000
      
      - name: Upload Cypress screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots
          path: apps/web/cypress/screenshots/
      
      - name: Teardown
        if: always()
        run: docker compose -f infrastructure/docker/docker-compose.test.yml down -v

  # ============================================================
  # BUILD Y PUSH DE IMÁGENES
  # ============================================================
  build-images:
    runs-on: ubuntu-latest
    needs: [integration-tests]
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        include:
          - service: config-server
            context: services/config-server
          - service: eureka-server
            context: services/eureka-server
          - service: api-gateway
            context: services/api-gateway
          - service: auth-service
            context: services/auth-service
          - service: document-service
            context: services/document-service
          - service: sync-service
            context: services/sync-service
          - service: asset-service
            context: services/asset-service
          - service: version-service
            context: services/version-service
          - service: notification-service
            context: services/notification-service
          - service: render-service
            context: services/render-service
          - service: web
            context: apps/web
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}
          tags: |
            type=sha,prefix=,suffix=,format=short
            type=ref,event=branch
            type=semver,pattern={{version}}
            latest
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.context }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
      
      - name: Run Trivy on image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:latest
          severity: CRITICAL
          exit-code: 1

  # ============================================================
  # DEPLOY A STAGING
  # ============================================================
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-images
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to staging (SSH + Docker Compose)
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/sdoc-platform
            git pull origin main
            
            # Actualizar imágenes
            docker compose pull
            
            # Blue-green rolling deploy
            for SERVICE in config-server eureka api-gateway auth-service document-service; do
              docker compose up -d --no-deps $SERVICE
              sleep 10
              # Health check antes de continuar
              SERVICE_PORT=$(docker compose port $SERVICE 8080 | cut -d: -f2)
              timeout 30 bash -c "until curl -sf http://localhost:${SERVICE_PORT}/actuator/health; do sleep 2; done"
            done
            
            docker compose up -d --no-deps sync-service asset-service version-service notification-service render-service render-worker web
            
            docker image prune -f
            echo "Staging deploy completed: $(date)"
      
      - name: Smoke tests on staging
        run: |
          sleep 30
          curl -f ${{ secrets.STAGING_URL }}/api/v1/health || exit 1
          echo "Staging smoke tests passed"
```

---

## 19. TESTING STRATEGY

### Testcontainers — Integration Test Base

```java
// shared/java-commons/.../test/IntegrationTestBase.java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("sdoc_test")
        .withUsername("sdoc_test")
        .withPassword("sdoc_test_password")
        .withReuse(true);  // Reutilizar contenedor entre tests (más rápido)

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.2-alpine")
        .withExposedPorts(6379)
        .withCommand("redis-server --requirepass test_password")
        .withReuse(true);

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    ).withReuse(true);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.data.redis.password", () -> "test_password");
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
        // Deshabilitar Vault en tests
        registry.add("spring.cloud.vault.enabled", () -> "false");
        registry.add("spring.cloud.config.enabled", () -> "false");
    }
}

// Test concreto
class DocumentServiceIT extends IntegrationTestBase {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentService documentService;

    @Test
    void createDocument_shouldPersistAndPublishEvent() {
        // Given
        var request = new CreateDocumentRequest("Mi Test Doc", null, "es", List.of());
        String userId = UUID.randomUUID().toString();

        // When
        var response = documentService.createDocument(request, userId);

        // Then
        assertThat(response.id()).isNotNull();
        assertThat(response.title()).isEqualTo("Mi Test Doc");
        
        // Verificar persistencia
        var saved = documentRepository.findByIdAndNotDeleted(response.id());
        assertThat(saved).isPresent();
        assertThat(saved.get().getOwnerId().toString()).isEqualTo(userId);
    }
}
```

---

## 21. ROADMAP POR FASES

### FASE 1 — Base Infrastructure (Semanas 1–3)

**Objetivo:** Stack completo levantado y comunicándose

- [ ] Monorepo configurado (Turborepo + Gradle multi-project)
- [ ] Config Server + Eureka Server funcionando
- [ ] Docker Compose completo: Kafka, Vault, Keycloak, PostgreSQL, Redis, MinIO
- [ ] Vault inicializado con todos los secretos
- [ ] Kafka topics creados
- [ ] Schema PostgreSQL aplicado (Flyway)
- [ ] Keycloak realm `sdoc` configurado (clientes, roles, flujos)
- [ ] OPA corriendo con políticas base

**Verificación:** `docker compose up -d` → todos los servicios en verde en Eureka Dashboard (:8761)

### FASE 2 — Microservicios Core (Semanas 4–8)

- [ ] api-gateway: rutas, JWT validation, rate limiting, circuit breakers, fallbacks
- [ ] auth-service: registro, login, JWT, Keycloak integration
- [ ] document-service: CRUD completo, FTS, permisos, OPA
- [ ] asset-service: upload/download, presigned URLs, compresión WebP
- [ ] Comunicación Feign entre servicios
- [ ] Kafka producers/consumers funcionando
- [ ] Audit log implementado
- [ ] Actuator + Prometheus metrics en todos los servicios
- [ ] Jaeger tracing funcionando end-to-end

**Verificación:** Crear documento vía API → aparece en PostgreSQL → evento en Kafka → auditado

### FASE 3 — Sincronización y Frontend (Semanas 9–13)

- [ ] sync-service: WebSockets, CRDTs Yjs, awareness, cursores
- [ ] render-service: Python, Celery, PDF export, DOCX import
- [ ] version-service: snapshots, diffs, restore
- [ ] notification-service: email via Resend, Kafka consumer
- [ ] Frontend React completo: auth, dashboard, editor TipTap + Yjs
- [ ] Offline-first: Service Worker + IndexedDB
- [ ] Export flow E2E: request → Kafka → Celery → S3 → email

**Verificación:** Dos usuarios editando mismo documento simultáneamente, sin conflictos

### FASE 4 — Monetización y Producción (Semanas 14–20)

- [ ] Stripe integration (suscripciones + webhooks)
- [ ] Organizaciones y equipos
- [ ] Límites por plan implementados (OPA policies)
- [ ] Deploy a VPS con Docker Compose (Hetzner/DigitalOcean)
- [ ] HTTPS con Let's Encrypt
- [ ] Grafana dashboards completos
- [ ] Alertas configuradas (Slack/email)
- [ ] Runbook de incidentes documentado

### FASE 5 — Scale y Enterprise (Semanas 21+)

- [ ] Migración a Kubernetes (Helm charts)
- [ ] Istio service mesh (mTLS automático)
- [ ] Elasticsearch para búsqueda avanzada
- [ ] OCR para PDF escaneados
- [ ] App desktop (Tauri)
- [ ] SDK público y API docs
- [ ] On-premise deployment option

---

## 22. CHECKLIST DE PRODUCCIÓN ENTERPRISE

### Seguridad
- [ ] Vault en modo producción (NO dev mode) con HA
- [ ] Unseal keys distribuidas (nunca en el mismo lugar)
- [ ] mTLS activo entre todos los microservicios
- [ ] JWT con expiración corta (15 min access, 7 días refresh)
- [ ] Rate limiting activo y probado
- [ ] OWASP Top 10 verificado
- [ ] Penetration testing realizado
- [ ] Secretos rotados (Vault lease renewal)
- [ ] Logs sin datos sensibles (PII redacted)
- [ ] DLQ monitoreado con alertas

### Disponibilidad
- [ ] Health checks en todos los servicios (liveness + readiness)
- [ ] Circuit breakers calibrados con datos reales
- [ ] Kafka replication factor ≥ 2 (producción)
- [ ] PostgreSQL con réplica de lectura
- [ ] Redis en modo Sentinel o Cluster
- [ ] MinIO en modo distribuido (≥ 4 nodos)
- [ ] Backups automáticos probados y restaurados

### Observabilidad
- [ ] Distributed tracing E2E funcionando (Jaeger)
- [ ] Dashboards Grafana para cada servicio
- [ ] SLO/SLA definidos y monitoreados
- [ ] Alertas probadas (fire drill)
- [ ] Runbook por cada alerta crítica
- [ ] Log retention policy definida

### Rendimiento
- [ ] Load testing realizado (k6 o Gatling)
- [ ] Índices PostgreSQL verificados con EXPLAIN ANALYZE
- [ ] Redis hit rate > 80%
- [ ] CDN para assets estáticos
- [ ] Frontend bundle < 500KB gzipped

### Legal / Compliance
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados
- [ ] GDPR: eliminación de cuenta y datos implementada
- [ ] Audit log inmutable para compliance
- [ ] Certificados SSL/TLS con auto-renovación

---

## APÉNDICE A — PUERTOS DE TODOS LOS SERVICIOS

| Servicio | Puerto | Descripción |
|---|---|---|
| web (frontend) | 3000 | App React |
| config-server | 8888 | Spring Cloud Config |
| eureka | 8761 | Service Discovery UI |
| api-gateway | 8080 | Entry point REST |
| auth-service | 8081 | Autenticación |
| document-service | 8082 | CRUD documentos |
| asset-service | 8083 | Archivos |
| version-service | 8084 | Historial |
| sync-service | 8085 | WebSockets CRDT |
| render-service | 8086 | PDF/conversión |
| notification-service | 8087 | Emails |
| kafka-ui | 8089 | Kafka Management UI |
| keycloak | 8090 | Identity Provider |
| opa | 8181 | Policy Agent |
| vault | 8200 | Secrets Management |
| zookeeper | 2181 | Kafka coordination |
| kafka | 29092 | Kafka (externo) |
| postgres | 5432 | Base de datos |
| redis | 6379 | Caché |
| minio | 9000 | Object storage |
| minio-console | 9001 | UI MinIO |
| prometheus | 9090 | Métricas |
| alertmanager | 9093 | Alertas |
| grafana | 3001 | Dashboards |
| loki | 3100 | Logs |
| jaeger | 16686 | Tracing UI |
| flower | 5555 | Celery monitoring |

## APÉNDICE B — COMANDOS RÁPIDOS

```bash
# Setup inicial completo
git clone https://github.com/tu-usuario/sdoc-platform.git && cd sdoc-platform
cp .env.example .env && nano .env  # Editar con valores reales

# Generar certificados para desarrollo
./scripts/generate-certs.sh

# Iniciar todo el stack
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Ver estado de todos los servicios en Eureka
open http://localhost:8761

# Ver topics y mensajes Kafka
open http://localhost:8089

# Ver secrets en Vault
open http://localhost:8200 (token: ver .env VAULT_DEV_TOKEN)

# Ver métricas
open http://localhost:3001  # Grafana (admin / ver GRAFANA_PASSWORD)
open http://localhost:9090  # Prometheus
open http://localhost:16686 # Jaeger

# Ver colas Celery
open http://localhost:5555  # Flower

# Logs de un servicio específico
docker compose logs -f document-service

# Shell en PostgreSQL
docker compose exec postgres psql -U sdoc -d sdoc_db

# Shell en Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD

# Reiniciar servicio sin bajar los demás
docker compose restart document-service

# Rebuild y redeploy de un servicio
docker compose up -d --build --no-deps document-service

# Ver el estado CRDT en Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD --scan --pattern "crdt:state:*"

# Ver todos los servicios registrados en Eureka
curl http://eureka-admin:$EUREKA_PASSWORD@localhost:8761/eureka/apps | python3 -m json.tool

# Probar API gateway
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sdoc.app","password":"Test1234!","fullName":"Test User"}'
```

---

*SDOC Platform — Master Build Prompt v2.0 Enterprise*  
*Enero 2025 — Spring Cloud · Kafka · Vault · mTLS · CRDTs · Kubernetes*  
*Este documento es la fuente única de verdad. Actualizar antes de cambiar cualquier decisión de arquitectura.*

---

# SUPLEMENTO v2.1 — COMPONENTES ENTERPRISE FALTANTES
## Adiciones críticas identificadas por auditoría exhaustiva de arquitectura

> Esta sección cubre los patrones y componentes que NO estaban en la v2.0 y son **obligatorios** para un sistema enterprise real. La IA que construya este proyecto DEBE leer y aplicar esta sección completa antes de construir cada módulo correspondiente.

---

## COMPONENTE A: OUTBOX PATTERN — Consistencia Garantizada entre DB y Kafka

### ¿Por qué es obligatorio?

Sin Outbox Pattern, cualquier servicio que haga `save(entity)` + `kafkaTemplate.send(event)` tiene una **race condition fatal**: si el proceso muere entre ambas operaciones, el evento se pierde o se envía sin que la DB haya commiteado. Esto rompe la consistencia del sistema distribuido.

**El Outbox Pattern resuelve esto con una sola transacción ACID.**

### Implementación Completa

```sql
-- Tabla outbox en PostgreSQL (en CADA servicio que produce eventos)
-- Agregar a: services/[nombre]/src/main/resources/db/migration/V002__outbox.sql

CREATE TABLE IF NOT EXISTS outbox_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_type  VARCHAR(100) NOT NULL,   -- Ej: "Document", "User"
  aggregate_id    VARCHAR(255) NOT NULL,   -- ID del aggregate raíz
  event_type      VARCHAR(255) NOT NULL,   -- Ej: "DocumentCreatedEvent"
  topic           VARCHAR(255) NOT NULL,   -- Topic Kafka destino
  payload         JSONB NOT NULL,          -- Contenido del evento serializado
  headers         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at)
  WHERE status = 'PENDING';
CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id);
```

```java
// shared/java-commons/src/main/java/app/sdoc/commons/outbox/OutboxEvent.java
@Entity
@Table(name = "outbox_events")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OutboxEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String aggregateType;
    
    @Column(nullable = false)
    private String aggregateId;
    
    @Column(nullable = false)
    private String eventType;
    
    @Column(nullable = false)
    private String topic;
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Object payload;
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> headers;
    
    @Enumerated(EnumType.STRING)
    private OutboxStatus status = OutboxStatus.PENDING;
    
    private int retryCount = 0;
    private int maxRetries = 3;
    
    @CreationTimestamp
    private Instant createdAt;
    private Instant sentAt;
    private String errorMessage;
    private String idempotencyKey;
}

// OutboxRepository.java
@Repository
public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OutboxEvent o WHERE o.status = 'PENDING' AND o.retryCount < o.maxRetries ORDER BY o.createdAt ASC")
    List<OutboxEvent> findPendingEventsWithLock(Pageable pageable);
    
    @Modifying
    @Query("UPDATE OutboxEvent o SET o.status = 'SENT', o.sentAt = :sentAt WHERE o.id = :id")
    void markAsSent(@Param("id") UUID id, @Param("sentAt") Instant sentAt);
    
    @Modifying
    @Query("""
        UPDATE OutboxEvent o SET 
          o.status = CASE WHEN o.retryCount + 1 >= o.maxRetries THEN 'FAILED' ELSE 'PENDING' END,
          o.retryCount = o.retryCount + 1,
          o.errorMessage = :error
        WHERE o.id = :id
        """)
    void markAsRetryOrFailed(@Param("id") UUID id, @Param("error") String error);
}

// OutboxPublisher — usado en lugar de kafkaTemplate.send() directo
@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {
    
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    
    /**
     * Guarda el evento en la tabla outbox DENTRO de la misma transacción de negocio.
     * El OutboxPoller lo enviará a Kafka de forma asíncrona.
     */
    @Transactional(propagation = Propagation.MANDATORY) // DEBE ser parte de una TX existente
    public void publish(String aggregateType, String aggregateId, 
                        String topic, Object event) {
        try {
            OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(event.getClass().getSimpleName())
                .topic(topic)
                .payload(event)
                .headers(Map.of(
                    "eventType", event.getClass().getSimpleName(),
                    "source", "sdoc-" + aggregateType.toLowerCase()
                ))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();
            
            outboxRepository.save(outboxEvent);
            log.debug("Outbox event saved: type={} aggregate={}", 
                event.getClass().getSimpleName(), aggregateId);
                
        } catch (Exception e) {
            throw new OutboxPublishException("Failed to save outbox event", e);
        }
    }
}

// OutboxPoller — proceso en background que lee la tabla y publica en Kafka
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPoller {
    
    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final int BATCH_SIZE = 50;
    
    @Scheduled(fixedDelay = 1000, initialDelay = 5000) // Cada 1 segundo
    @Transactional
    public void pollAndPublish() {
        List<OutboxEvent> pendingEvents = outboxRepository
            .findPendingEventsWithLock(PageRequest.of(0, BATCH_SIZE));
        
        if (pendingEvents.isEmpty()) return;
        
        log.debug("Processing {} outbox events", pendingEvents.size());
        
        for (OutboxEvent event : pendingEvents) {
            try {
                // Crear mensaje Kafka con headers
                ProducerRecord<String, Object> record = new ProducerRecord<>(
                    event.getTopic(),
                    null,
                    event.getAggregateId(),
                    event.getPayload(),
                    buildHeaders(event)
                );
                
                // Enviar de forma síncrona para confirmar entrega
                kafkaTemplate.send(record).get(10, TimeUnit.SECONDS);
                
                outboxRepository.markAsSent(event.getId(), Instant.now());
                
            } catch (Exception e) {
                log.error("Failed to publish outbox event {}: {}", event.getId(), e.getMessage());
                outboxRepository.markAsRetryOrFailed(event.getId(), e.getMessage());
            }
        }
    }
    
    private Iterable<Header> buildHeaders(OutboxEvent event) {
        List<Header> headers = new ArrayList<>();
        event.getHeaders().forEach((k, v) -> 
            headers.add(new RecordHeader(k, v.getBytes(StandardCharsets.UTF_8)))
        );
        headers.add(new RecordHeader("idempotencyKey", 
            event.getIdempotencyKey().getBytes(StandardCharsets.UTF_8)));
        return headers;
    }
}

// CÓMO USARLO — en DocumentService, reemplazar kafkaTemplate.send() por:
@Service
@Transactional
public class DocumentService {
    
    private final DocumentRepository documentRepository;
    private final OutboxPublisher outboxPublisher;
    
    public DocumentResponse createDocument(CreateDocumentRequest request, String userId) {
        // Todo en una sola transacción ACID:
        Document doc = documentRepository.save(Document.from(request, userId));
        
        // El evento se guarda en la MISMA transacción que el documento
        outboxPublisher.publish(
            "Document", doc.getId().toString(),
            DocumentCreatedEvent.TOPIC,
            DocumentCreatedEvent.from(doc, userId)
        );
        
        // Si la transacción hace rollback: NI el doc NI el evento quedan guardados
        // Si commitea: el OutboxPoller enviará el evento a Kafka garantizadamente
        return DocumentMapper.INSTANCE.toResponse(doc);
    }
}
```

---

## COMPONENTE B: CQRS — Separación Lectura/Escritura

### ¿Cuándo aplica en SDOC?

El document-service tiene un patrón de lectura muy diferente al de escritura:
- **Escrituras:** Individuales, transaccionales, frecuentes
- **Lecturas del dashboard:** Joins complejos, agregaciones, paginación, FTS

CQRS resuelve esto separando los modelos.

```java
// COMMAND SIDE (escrituras) — ya implementado en DocumentService
// QUERY SIDE (lecturas) — modelo optimizado para consultas

// services/document-service/src/main/java/app/sdoc/document/query/

// Read model — proyección optimizada para el dashboard
@Entity
@Table(name = "document_read_model")
@Immutable // Solo lectura
public class DocumentReadModel {
    @Id private UUID id;
    private String title;
    private String ownerName;
    private String ownerAvatarUrl;
    private DocumentStatus status;
    private Integer wordCount;
    private Integer pageCount;
    private String thumbnailUrl;
    private Instant updatedAt;
    private Instant createdAt;
    private Integer collaboratorCount;
    private String[] tags;
    private Boolean isPublic;
    private Long version;
}

// Vista materializada en PostgreSQL (mucho más rápido que JOINs en runtime)
// Agregar a: V003__read_model_views.sql
/*
CREATE MATERIALIZED VIEW document_read_model AS
SELECT 
    d.id,
    d.title,
    d.status,
    d.word_count,
    d.page_count,
    d.updated_at,
    d.created_at,
    d.tags,
    d.is_public,
    d.version,
    u.full_name AS owner_name,
    u.avatar_url AS owner_avatar_url,
    (SELECT COUNT(*) FROM document_permissions dp WHERE dp.document_id = d.id) AS collaborator_count,
    concat('https://cdn.sdoc.app/previews/', d.id, '/thumbnail.webp') AS thumbnail_url
FROM documents d
JOIN users u ON d.owner_id = u.id
WHERE d.deleted_at IS NULL;

CREATE UNIQUE INDEX ON document_read_model(id);
CREATE INDEX ON document_read_model(updated_at DESC);

-- Refrescar la vista cuando cambia un documento (via trigger)
CREATE OR REPLACE FUNCTION refresh_document_read_model()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY document_read_model;
    RETURN NULL;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_read_model_on_document_change
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_document_read_model();
*/

// DocumentQueryService — solo lecturas, nunca modifica
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DocumentQueryService {
    
    private final DocumentReadModelRepository readModelRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    
    public Page<DocumentReadModel> getDashboard(String userId, Pageable pageable) {
        String cacheKey = "dashboard:v2:" + userId + ":" + pageable.getPageNumber();
        
        // Intentar desde caché
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return (Page<DocumentReadModel>) cached;
        
        // Si no: ir al read model (vista materializada — muy rápido)
        Page<DocumentReadModel> result = readModelRepository
            .findByOwnerIdOrderByUpdatedAtDesc(UUID.fromString(userId), pageable);
        
        redisTemplate.opsForValue().set(cacheKey, result, Duration.ofSeconds(30));
        return result;
    }
    
    // Búsqueda full-text directamente en el read model
    public Page<DocumentReadModel> search(String userId, String query, String[] tags, Pageable pageable) {
        return readModelRepository.fullTextSearch(
            UUID.fromString(userId), query, tags, pageable
        );
    }
}
```

---

## COMPONENTE C: SCHEMA REGISTRY + AVRO — Contratos de Eventos Versionados

### ¿Por qué es crítico?

Sin Schema Registry, un cambio en la estructura de un evento Kafka rompe todos los consumers sin previo aviso. Con Schema Registry + Avro, los cambios son validados, versionados y compatibles hacia atrás/adelante.

```yaml
# Agregar a docker-compose.yml
schema-registry:
  image: confluentinc/cp-schema-registry:7.6.0
  container_name: sdoc-schema-registry
  restart: unless-stopped
  depends_on:
    kafka: { condition: service_healthy }
  environment:
    SCHEMA_REGISTRY_HOST_NAME: schema-registry
    SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
    SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
    SCHEMA_REGISTRY_DEBUG: 'false'
  ports:
    - "8091:8081"
  networks:
    - sdoc-network
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:8081/subjects || exit 1"]
    interval: 15s
    timeout: 10s
    retries: 10

schema-registry-ui:
  image: landoop/schema-registry-ui:latest
  container_name: sdoc-schema-registry-ui
  environment:
    SCHEMAREGISTRY_URL: http://schema-registry:8081
  ports:
    - "8092:8000"
  networks:
    - sdoc-network
```

```json
// Schemas Avro en: shared/avro-schemas/

// DocumentCreatedEvent.avsc
{
  "type": "record",
  "name": "DocumentCreatedEvent",
  "namespace": "app.sdoc.events.v1",
  "doc": "Publicado cuando se crea un nuevo documento",
  "fields": [
    { "name": "documentId", "type": "string", "doc": "UUID del documento" },
    { "name": "ownerId", "type": "string" },
    { "name": "title", "type": "string" },
    { "name": "language", "type": { "type": "enum", "name": "Language",
        "symbols": ["es", "en", "fr", "pt", "de"] }, "default": "es" },
    { "name": "occurredAt", "type": { "type": "long", "logicalType": "timestamp-millis" } },
    { "name": "metadata", "type": { "type": "map", "values": "string" }, "default": {} }
  ]
}

// ExportRequestedEvent.avsc
{
  "type": "record",
  "name": "ExportRequestedEvent",
  "namespace": "app.sdoc.events.v1",
  "fields": [
    { "name": "jobId", "type": "string" },
    { "name": "documentId", "type": "string" },
    { "name": "requestedBy", "type": "string" },
    { "name": "format", "type": { "type": "enum", "name": "ExportFormat",
        "symbols": ["PDF", "DOCX", "HTML", "MARKDOWN", "TXT", "EPUB"] } },
    { "name": "options", "type": { "type": "map", "values": "string" }, "default": {} },
    { "name": "occurredAt", "type": { "type": "long", "logicalType": "timestamp-millis" } }
  ]
}
```

```kotlin
// Agregar a build.gradle.kts de servicios que producen/consumen eventos
plugins {
    id("com.github.davidmc24.gradle.plugin.avro") version "1.9.1"
}

dependencies {
    implementation("io.confluent:kafka-avro-serializer:7.6.0")
    implementation("io.confluent:kafka-schema-registry-client:7.6.0")
}

// Config en application.yml del servicio
spring:
  kafka:
    producer:
      value-serializer: io.confluent.kafka.serializers.KafkaAvroSerializer
    consumer:
      value-deserializer: io.confluent.kafka.serializers.KafkaAvroDeserializer
    properties:
      schema.registry.url: http://schema-registry:8081
      specific.avro.reader: true
      auto.register.schemas: false  # En producción: registrar schemas manualmente
      use.latest.version: true
```

---

## COMPONENTE D: FEATURE FLAGS — Unleash (Self-Hosted)

### ¿Por qué es obligatorio en un SaaS enterprise?

Sin feature flags no puedes:
- Hacer canary releases sin rollback instantáneo
- Activar features por tier (FREE/PRO/ENTERPRISE) sin redesplegar
- Hacer A/B testing
- Desactivar una feature rota en producción en segundos (kill switch)

```yaml
# Agregar a docker-compose.yml
unleash:
  image: unleashorg/unleash-server:latest
  container_name: sdoc-unleash
  restart: unless-stopped
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/unleash_db
    DATABASE_SSL: 'false'
    UNLEASH_DEFAULT_ADMIN_USERNAME: admin
    UNLEASH_DEFAULT_ADMIN_PASSWORD: ${UNLEASH_ADMIN_PASSWORD}
    AUTH_TYPE: OPEN  # En producción: usar SSO con Keycloak
    LOG_LEVEL: warn
  ports:
    - "4242:4242"
  networks:
    - sdoc-network
  depends_on:
    postgres: { condition: service_healthy }
```

```java
// Integración en Spring Boot
// Agregar a todos los servicios:
// dependencies: implementation("io.getunleash:unleash-client-java:9.2.0")

@Configuration
public class UnleashConfig {
    
    @Bean
    public Unleash unleash(
        @Value("${unleash.url:http://unleash:4242/api}") String unleashUrl,
        @Value("${spring.application.name}") String appName,
        @Value("${unleash.client-key}") String clientKey
    ) {
        UnleashConfig config = UnleashConfig.newBuilder()
            .appName(appName)
            .instanceId(System.getenv("HOSTNAME"))
            .unleashAPI(unleashUrl)
            .apiKey(clientKey)
            .synchronousFetchOnInitialisation(true)
            .build();
        
        return new DefaultUnleash(config);
    }
}

// Feature flags definidos en SDOC — registrar en Unleash UI:
/*
  Flags:
  - sdoc.feature.collaboration        (toggle — activa/desactiva colaboración)
  - sdoc.feature.offline              (toggle)
  - sdoc.feature.ocr                  (toggle — beta)
  - sdoc.feature.3d-assets            (toggle — beta)
  - sdoc.plan.export-pdf              (strategy: UserWithId, constraint: plan IN [PRO, ENTERPRISE])
  - sdoc.plan.advanced-search         (strategy: UserWithId, constraint: plan IN [PRO, ENTERPRISE])
  - sdoc.plan.api-access              (strategy: UserWithId, constraint: plan = ENTERPRISE)
  - sdoc.rollout.new-editor           (gradual rollout: 10% → 50% → 100%)
  - sdoc.killswitch.sync              (kill switch para emergencias)
*/

// Uso en servicios:
@Service
@RequiredArgsConstructor
public class DocumentService {
    
    private final Unleash unleash;
    
    public ExportJobResponse requestExport(UUID documentId, ExportFormat format, String userId) {
        // Verificar feature flag por plan del usuario
        UnleashContext context = UnleashContext.builder()
            .userId(userId)
            .addProperty("plan", getUserPlan(userId))
            .build();
        
        if (!unleash.isEnabled("sdoc.plan.export-pdf", context)) {
            throw new PlanLimitException("La exportación PDF requiere plan PRO o superior");
        }
        
        // Verificar kill switch
        if (!unleash.isEnabled("sdoc.killswitch.sync")) {
            throw new FeatureDisabledException("El servicio de exportación está temporalmente desactivado");
        }
        
        // Proceder con la exportación...
    }
}
```

---

## COMPONENTE E: API VERSIONING STRATEGY

### Estrategia de Versionado

**Regla absoluta:** Nunca romper clientes existentes. Toda ruta tiene versión explícita.

```java
// services/api-gateway/src/main/java/app/sdoc/gateway/config/ApiVersioningConfig.java

// Estrategia 1: URL Path versioning (IMPLEMENTADO - más explícito)
// /api/v1/documents → versión 1
// /api/v2/documents → versión 2 (cuando haya breaking changes)

// Estrategia 2: Header versioning (para clientes API avanzados)
// Accept: application/vnd.sdoc.v2+json

// Estrategia 3: Query param (NO usar — dificulta caché)

// Configuración en Gateway para soportar ambas estrategias:
@Bean
public RouteLocator versionedRouteLocator(RouteLocatorBuilder builder) {
    return builder.routes()
        // v1 — ruta actual
        .route("document-service-v1", r -> r
            .path("/api/v1/documents/**")
            .uri("lb://document-service"))
        
        // v2 — nueva versión (cuando exista)
        .route("document-service-v2", r -> r
            .path("/api/v2/documents/**")
            .uri("lb://document-service-v2"))
        
        // Soporte header versioning
        .route("document-service-header-v2", r -> r
            .path("/api/documents/**")
            .and()
            .header("Accept", "application/vnd.sdoc.v2\\+json")
            .filters(f -> f.rewritePath("/api/documents/(?<segment>.*)", "/api/v2/documents/${segment}"))
            .uri("lb://document-service"))
        
        .build();
}

// Controlador con versión explícita
@RestController
@RequestMapping("/api/v1/documents")
@Tag(name = "Documents v1", description = "API de documentos — versión 1")
public class DocumentControllerV1 {
    // implementación v1
}

@RestController
@RequestMapping("/api/v2/documents")
@Tag(name = "Documents v2", description = "API de documentos — versión 2 (breaking changes)")
public class DocumentControllerV2 {
    // implementación v2 con cambios
}

// Deprecation headers — avisar a clientes que usen versiones antiguas
@Component
public class DeprecationHeaderFilter implements GlobalFilter {
    
    private static final Map<String, String> DEPRECATED_PATHS = Map.of(
        "/api/v1/documents", "2026-12-31" // Deprecated, se eliminará en esta fecha
    );
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        
        DEPRECATED_PATHS.entrySet().stream()
            .filter(e -> path.startsWith(e.getKey()))
            .findFirst()
            .ifPresent(e -> {
                exchange.getResponse().getHeaders().add(
                    "Deprecation", "true"
                );
                exchange.getResponse().getHeaders().add(
                    "Sunset", e.getValue()
                );
                exchange.getResponse().getHeaders().add(
                    "Link", "</api/v2/documents>; rel=\"successor-version\""
                );
            });
        
        return chain.filter(exchange);
    }
    
    @Override
    public int getOrder() { return 0; }
}
```

---

## COMPONENTE F: MULTITENANCY — Aislamiento Real por Organización

### Modelo de Multitenancy adoptado: Shared DB + Schema per Tenant

Para el Tier FREE y PRO: shared schema con `organization_id` discriminator.  
Para el Tier ENTERPRISE: schema dedicado por organización (máximo aislamiento).

```java
// services/document-service/src/main/java/app/sdoc/document/multitenancy/

// TenantContext — almacena el tenant del request actual (thread-local)
public class TenantContext {
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_SCHEMA = new ThreadLocal<>();
    
    public static void setTenant(String tenantId) {
        CURRENT_TENANT.set(tenantId);
        CURRENT_SCHEMA.set("tenant_" + tenantId.replace("-", "_")); // schema PostgreSQL seguro
    }
    
    public static String getTenant() { return CURRENT_TENANT.get(); }
    public static String getSchema() { 
        return CURRENT_SCHEMA.get() != null ? CURRENT_SCHEMA.get() : "public"; 
    }
    
    public static void clear() {
        CURRENT_TENANT.remove();
        CURRENT_SCHEMA.remove();
    }
}

// TenantFilter — extrae tenant del JWT y lo pone en TenantContext
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class TenantResolutionFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            
            // El tenant viene en el header inyectado por el Gateway
            // (el Gateway lo extrajo del JWT claim "organization_id")
            String orgId = httpRequest.getHeader("X-Org-Id");
            String userPlan = httpRequest.getHeader("X-User-Plan");
            
            if (orgId != null && !orgId.isEmpty() && "ENTERPRISE".equals(userPlan)) {
                // Enterprise: usar schema dedicado
                TenantContext.setTenant(orgId);
            } else {
                // FREE/PRO: schema compartido, filtrar por organization_id en queries
                TenantContext.setTenant("shared");
            }
            
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear(); // CRÍTICO: limpiar siempre
        }
    }
}

// Multi-tenant DataSource — cambia el schema según el tenant
@Component
public class TenantAwareDataSource extends AbstractRoutingDataSource {
    
    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenant();
    }
}

// Hibernate Multi-tenant Schema Provider
@Component
public class SchemaBasedMultiTenantConnectionProvider
        extends AbstractMultiTenantConnectionProvider<String> {
    
    private final DataSource dataSource;
    
    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection conn = dataSource.getConnection();
        if (!"shared".equals(tenantIdentifier)) {
            // Enterprise: cambiar al schema dedicado del tenant
            conn.setSchema(tenantIdentifier);
        }
        return conn;
    }
}

// Flyway Migration para Enterprise tenants — crear schema al onboarding
@Service
@RequiredArgsConstructor
public class TenantProvisioningService {
    
    private final DataSource dataSource;
    
    @Transactional
    public void provisionEnterpriseTenant(String organizationId) {
        String schemaName = "tenant_" + organizationId.replace("-", "_");
        
        // 1. Crear schema PostgreSQL
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
        }
        
        // 2. Ejecutar migraciones Flyway en el nuevo schema
        Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .schemas(schemaName)
            .locations("classpath:db/migration/tenant")
            .load();
        
        flyway.migrate();
        
        log.info("Enterprise tenant provisioned: schema={}", schemaName);
    }
}
```

---

## COMPONENTE G: KUBERNETES COMPLETO — Producción Real

### Helm Chart Principal

```yaml
# k8s/helm/sdoc/values.yaml
global:
  imageRegistry: ghcr.io/sdoc-platform
  imagePullPolicy: IfNotPresent
  environment: production
  domain: sdoc.app

# ---- Réplicas por servicio ----
replicaCount:
  configServer: 2
  eureka: 2
  apiGateway: 3
  authService: 2
  documentService: 3      # Más réplicas por ser el crítico
  syncService: 2
  assetService: 2
  versionService: 2
  notificationService: 2
  renderService: 2
  renderWorker: 4         # Workers Celery — escalan horizontalmente

# ---- Resources por servicio ----
resources:
  apiGateway:
    requests: { memory: "256Mi", cpu: "250m" }
    limits:   { memory: "512Mi", cpu: "500m" }
  documentService:
    requests: { memory: "512Mi", cpu: "500m" }
    limits:   { memory: "1Gi",   cpu: "1000m" }
  syncService:
    requests: { memory: "256Mi", cpu: "250m" }
    limits:   { memory: "512Mi", cpu: "500m" }
  renderService:
    requests: { memory: "512Mi", cpu: "500m" }
    limits:   { memory: "2Gi",   cpu: "2000m" }  # Render consume más
  renderWorker:
    requests: { memory: "1Gi",   cpu: "1000m" }
    limits:   { memory: "4Gi",   cpu: "4000m" }

# ---- HPA (Horizontal Pod Autoscaler) ----
hpa:
  apiGateway:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilization: 70
    targetMemoryUtilization: 80
  documentService:
    enabled: true
    minReplicas: 3
    maxReplicas: 15
    targetCPUUtilization: 70
  renderWorker:
    enabled: true
    minReplicas: 2
    maxReplicas: 20
    # KEDA para escalar por longitud de cola Celery
    kedaEnabled: true
    kedaScaleTarget: "celery-queue-length"
    kedaMinReplicaCount: 2
    kedaMaxReplicaCount: 20
    kedaPollingInterval: 10
    kedaCooldownPeriod: 30

# ---- PodDisruptionBudgets ----
pdb:
  apiGateway:    { minAvailable: 2 }
  documentService: { minAvailable: 2 }
  syncService:   { minAvailable: 1 }
  authService:   { minAvailable: 1 }
```

```yaml
# k8s/helm/sdoc/templates/document-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: document-service
  namespace: {{ .Release.Namespace }}
  labels:
    app: document-service
    version: {{ .Chart.AppVersion }}
spec:
  replicas: {{ .Values.replicaCount.documentService }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0      # Zero-downtime update
  selector:
    matchLabels:
      app: document-service
  template:
    metadata:
      labels:
        app: document-service
        version: {{ .Chart.AppVersion }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/actuator/prometheus"
        prometheus.io/port: "8082"
    spec:
      # Anti-affinity: no poner dos pods del mismo servicio en el mismo nodo
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: document-service
                topologyKey: kubernetes.io/hostname
      
      # Graceful shutdown: dar tiempo a terminar requests en curso
      terminationGracePeriodSeconds: 60
      
      containers:
        - name: document-service
          image: "{{ .Values.global.imageRegistry }}/document-service:{{ .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.global.imagePullPolicy }}
          ports:
            - name: http
              containerPort: 8082
          
          # Variables de entorno desde Vault via External Secrets Operator
          env:
            - name: VAULT_ADDR
              value: "http://vault:8200"
            - name: SPRING_PROFILES_ACTIVE
              value: "kubernetes"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://jaeger-collector:4318"
          
          # Resources
          resources:
            requests:
              memory: {{ .Values.resources.documentService.requests.memory }}
              cpu: {{ .Values.resources.documentService.requests.cpu }}
            limits:
              memory: {{ .Values.resources.documentService.limits.memory }}
              cpu: {{ .Values.resources.documentService.limits.cpu }}
          
          # Probes
          startupProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8082
            failureThreshold: 30
            periodSeconds: 10
            initialDelaySeconds: 30
          
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8082
            initialDelaySeconds: 0
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
          
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8082
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 3
            timeoutSeconds: 3
          
          # Graceful shutdown
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 15"]  # Esperar que el LB deje de enviar tráfico

---
# PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: document-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: document-service

---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: document-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: document-service
  minReplicas: 3
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # Esperar 5 min antes de escalar down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 30
```

```yaml
# KEDA — Escalar render-worker según longitud de cola Celery en Redis
# k8s/helm/sdoc/templates/render-worker/keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: render-worker-scaler
spec:
  scaleTargetRef:
    name: render-worker
  minReplicaCount: 2
  maxReplicaCount: 20
  pollingInterval: 10
  cooldownPeriod: 30
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: celery        # Cola principal de Celery en Redis
        listLength: "5"         # Escalar cuando hay más de 5 jobs en espera
        databaseIndex: "1"
      authenticationRef:
        name: redis-auth

---
# NetworkPolicy — cada servicio solo puede hablar con los que necesita
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: document-service-netpol
spec:
  podSelector:
    matchLabels:
      app: document-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Solo recibe tráfico del api-gateway
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8082
  egress:
    # Solo puede hablar con: postgres, redis, kafka, vault, eureka, asset-service, version-service
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - port: 9092
    - to:
        - podSelector:
            matchLabels:
              app: vault
      ports:
        - port: 8200
    - to:
        - podSelector:
            matchLabels:
              app: asset-service
          podSelector:
            matchLabels:
              app: version-service
      ports:
        - port: 8083
        - port: 8084

---
# ResourceQuota por namespace — evitar que un servicio malgaste todo el cluster
apiVersion: v1
kind: ResourceQuota
metadata:
  name: sdoc-production-quota
  namespace: sdoc-production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"
    services: "20"
    persistentvolumeclaims: "20"

---
# LimitRange — defaults para pods sin recursos definidos
apiVersion: v1
kind: LimitRange
metadata:
  name: sdoc-limits
  namespace: sdoc-production
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4000m"
        memory: "8Gi"
```

---

## COMPONENTE H: EXTERNAL SECRETS OPERATOR — Vault → K8s Secrets

En Kubernetes producción, **nunca** poner secretos directamente en valores de Helm. Usar External Secrets Operator para sincronizar desde Vault.

```yaml
# k8s/helm/sdoc/templates/external-secrets/document-service-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: document-service-secrets
  namespace: sdoc-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: document-service-secret
    creationPolicy: Owner
  data:
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: secret/sdoc/database
        property: password
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: secret/sdoc/redis
        property: password
    - secretKey: MINIO_ACCESS_KEY
      remoteRef:
        key: secret/sdoc/minio
        property: access-key
    - secretKey: MINIO_SECRET_KEY
      remoteRef:
        key: secret/sdoc/minio
        property: secret-key
    - secretKey: ENCRYPTION_MASTER_KEY
      remoteRef:
        key: secret/sdoc/encryption
        property: master-key

---
# ClusterSecretStore — conecta ESO con Vault
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "http://vault.sdoc-infra:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: "external-secrets-sa"
```

---

## COMPONENTE I: STRUCTURED LOGGING — JSON con Logback

Todos los servicios DEBEN loguear en JSON para que Loki/ELK puedan indexar y buscar eficientemente.

```xml
<!-- services/[nombre]/src/main/resources/logback-spring.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  
  <!-- ====== DESARROLLO: logs legibles ====== -->
  <springProfile name="!production">
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{HH:mm:ss.SSS} [%thread] [%X{traceId:-}/%X{spanId:-}] %-5level %logger{36} - %msg%n</pattern>
      </encoder>
    </appender>
    <root level="INFO">
      <appender-ref ref="CONSOLE"/>
    </root>
  </springProfile>
  
  <!-- ====== PRODUCCIÓN: JSON estructurado ====== -->
  <springProfile name="production,kubernetes,docker">
    <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <!-- Campos adicionales en todos los logs -->
        <customFields>{"app":"${spring.application.name:-unknown}","env":"${ENVIRONMENT:-unknown}"}</customFields>
        <!-- Incluir trace IDs de OpenTelemetry -->
        <includeMdcKeyName>traceId</includeMdcKeyName>
        <includeMdcKeyName>spanId</includeMdcKeyName>
        <includeMdcKeyName>userId</includeMdcKeyName>
        <includeMdcKeyName>requestId</includeMdcKeyName>
        <includeMdcKeyName>tenantId</includeMdcKeyName>
        <!-- NO loguear datos sensibles -->
        <excludeMdcKeyName>password</excludeMdcKeyName>
        <excludeMdcKeyName>token</excludeMdcKeyName>
        <excludeMdcKeyName>secret</excludeMdcKeyName>
      </encoder>
    </appender>
    
    <!-- Async appender para no bloquear threads de negocio -->
    <appender name="ASYNC_JSON" class="ch.qos.logback.classic.AsyncAppender">
      <queueSize>1024</queueSize>
      <neverBlock>true</neverBlock>
      <appender-ref ref="JSON_CONSOLE"/>
    </appender>
    
    <root level="INFO">
      <appender-ref ref="ASYNC_JSON"/>
    </root>
    
    <!-- Reducir verbosidad de librerías externas -->
    <logger name="org.springframework" level="WARN"/>
    <logger name="org.hibernate" level="WARN"/>
    <logger name="org.apache.kafka" level="WARN"/>
    <logger name="com.netflix.eureka" level="WARN"/>
    <!-- Logs de negocio al máximo -->
    <logger name="app.sdoc" level="INFO"/>
  </springProfile>
  
</configuration>
```

```java
// Interceptor para enriquecer el MDC con datos del request
@Component
public class MdcEnrichmentFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            
            // Enriquecer MDC para que aparezca en TODOS los logs del request
            MDC.put("userId", httpRequest.getHeader("X-User-Id"));
            MDC.put("requestId", httpRequest.getHeader("X-Request-Id"));
            MDC.put("tenantId", httpRequest.getHeader("X-Org-Id"));
            MDC.put("userAgent", httpRequest.getHeader("User-Agent"));
            MDC.put("path", httpRequest.getRequestURI());
            MDC.put("method", httpRequest.getMethod());
            
            chain.doFilter(request, response);
            
        } finally {
            MDC.clear(); // OBLIGATORIO: evitar leaks entre requests
        }
    }
}
```

---

## COMPONENTE J: GITOPS CON ARGOCD — Despliegue Declarativo

```yaml
# k8s/argocd/applications/sdoc-production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sdoc-production
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts
spec:
  project: sdoc
  
  source:
    repoURL: https://github.com/sdoc-platform/sdoc-platform.git
    targetRevision: main
    path: k8s/helm/sdoc
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  
  destination:
    server: https://kubernetes.default.svc
    namespace: sdoc-production
  
  syncPolicy:
    automated:
      prune: true       # Eliminar recursos que ya no están en Git
      selfHeal: true    # Revertir cambios manuales (drift)
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - RespectIgnoreDifferences=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  
  # Ignorar diferencias en campos manejados por K8s
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # HPA maneja las réplicas
```

---

## COMPONENTE K: GDPR Y COMPLIANCE — Borrado Real de Datos

```java
// services/auth-service/src/main/java/app/sdoc/auth/gdpr/GdprService.java

@Service
@Transactional
@Slf4j
public class GdprService {
    
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final AssetRepository assetRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final MinioClient minioClient;
    private final OutboxPublisher outboxPublisher;
    private final AuditLogRepository auditLogRepository;
    
    /**
     * Elimina TODOS los datos del usuario según GDPR Art. 17 (Derecho al olvido).
     * Esta operación es IRREVERSIBLE.
     */
    public void deleteUserData(UUID userId, String requestedByUserId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        
        log.info("GDPR deletion requested for user: {}", userId);
        
        // 1. Obtener todos los documentos del usuario
        List<Document> documents = documentRepository.findAllByOwnerId(userId);
        
        // 2. Eliminar assets de S3/MinIO para cada documento
        for (Document doc : documents) {
            List<Asset> assets = assetRepository.findByDocumentId(doc.getId());
            for (Asset asset : assets) {
                try {
                    minioClient.removeObject(RemoveObjectArgs.builder()
                        .bucket("sdoc-assets")
                        .object(asset.getStorageKey())
                        .build());
                } catch (Exception e) {
                    log.error("Failed to delete asset {} from storage: {}", asset.getId(), e.getMessage());
                }
                assetRepository.delete(asset);
            }
            
            // Eliminar versiones del documento de S3
            deleteDocumentVersions(doc.getId());
            
            // Soft delete → hard delete del documento
            documentRepository.delete(doc);
        }
        
        // 3. Anonimizar en lugar de eliminar el audit log (mantener integridad)
        // (reemplazar datos PII por "[REDACTED]")
        auditLogRepository.anonymizeUserData(userId);
        
        // 4. Eliminar el usuario
        userRepository.delete(user);
        
        // 5. Revocar tokens en Keycloak
        keycloakAdmin.deleteUser(user.getKeycloakId());
        
        // 6. Publicar evento para que otros servicios limpien sus datos
        outboxPublisher.publish(
            "User", userId.toString(),
            "sdoc.users.deleted",
            new UserDeletedEvent(userId, Instant.now())
        );
        
        // 7. Registrar en audit log que se realizó la eliminación
        auditLogRepository.save(AuditLog.builder()
            .action("GDPR_USER_DATA_DELETION")
            .resourceType("User")
            .resourceId(userId)
            .actorId(UUID.fromString(requestedByUserId))
            .details(Map.of(
                "reason", "User requested deletion (GDPR Art. 17)",
                "documentsDeleted", documents.size()
            ))
            .build()
        );
        
        log.info("GDPR deletion completed for user: {} - {} documents deleted", 
            userId, documents.size());
    }
    
    /**
     * Exportar todos los datos del usuario según GDPR Art. 20 (Portabilidad).
     */
    public byte[] exportUserData(UUID userId) {
        // ... generar ZIP con todos los documentos, metadatos y actividad del usuario
    }
}
```

---

## COMPONENTE L: PERFORMANCE — Virtual Threads (Java 21)

Java 21 Virtual Threads (Project Loom) mejoran dramáticamente el throughput en servicios con operaciones I/O bloqueantes. Activar en todos los servicios.

```yaml
# En application.yml de todos los servicios Java
spring:
  threads:
    virtual:
      enabled: true    # Habilitar Virtual Threads en Spring Boot 3.2+

# Esto hace que Tomcat y Spring @Async usen Virtual Threads automáticamente
# Mejora de throughput: hasta 10x en workloads I/O-bound sin cambios de código
```

```java
// Para Feign Clients con Virtual Threads — usar HTTP Client nativo
@Configuration
public class FeignHttpClientConfig {
    
    @Bean
    public HttpClient jdkHttpClient() {
        return HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .executor(Executors.newVirtualThreadPerTaskExecutor()) // Virtual Threads
            .build();
    }
}

// Para Celery Workers Python — usar uvicorn con múltiples workers
// En render-service/Dockerfile:
// CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8086", "--workers", "4", "--loop", "uvloop"]
```

---

## COMPONENTE M: HEALTH CHECK AVANZADO — Readiness Granular

```java
// En cada servicio: health indicator personalizado
@Component
public class DocumentServiceHealthIndicator implements HealthIndicator {
    
    private final DocumentRepository documentRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Override
    public Health health() {
        Map<String, Object> details = new LinkedHashMap<>();
        boolean healthy = true;
        
        // Verificar PostgreSQL
        try {
            documentRepository.count();
            details.put("database", "UP");
        } catch (Exception e) {
            details.put("database", "DOWN: " + e.getMessage());
            healthy = false;
        }
        
        // Verificar Redis
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            details.put("redis", "UP");
        } catch (Exception e) {
            details.put("redis", "DOWN: " + e.getMessage());
            healthy = false;
        }
        
        // Verificar conectividad con Kafka
        try {
            kafkaTemplate.getProducerFactory().createProducer().partitionsFor("sdoc.documents.created");
            details.put("kafka", "UP");
        } catch (Exception e) {
            details.put("kafka", "DEGRADED: " + e.getMessage());
            // Kafka degradado no hace el servicio unhealthy para readiness
            // pero sí afecta su funcionalidad
        }
        
        return healthy 
            ? Health.up().withDetails(details).build()
            : Health.down().withDetails(details).build();
    }
}
```

---

## COMPONENTE N: BACKUP STRATEGY — Automatizado

```bash
#!/bin/bash
# scripts/backup.sh — Ejecutar diariamente via cron o K8s CronJob

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_BUCKET="sdoc-backups"
RETENTION_DAYS=30

echo "Starting backup: $TIMESTAMP"

# 1. PostgreSQL — dump completo
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  --format=custom \
  --compress=9 \
  -f /tmp/sdoc_db_$TIMESTAMP.dump

# Subir a S3/MinIO
aws s3 cp /tmp/sdoc_db_$TIMESTAMP.dump \
  s3://$BACKUP_BUCKET/postgresql/$TIMESTAMP/sdoc_db.dump \
  --sse aws:kms

rm /tmp/sdoc_db_$TIMESTAMP.dump

# 2. Vault — snapshot
vault operator raft snapshot save /tmp/vault_$TIMESTAMP.snap
aws s3 cp /tmp/vault_$TIMESTAMP.snap \
  s3://$BACKUP_BUCKET/vault/$TIMESTAMP/vault.snap
rm /tmp/vault_$TIMESTAMP.snap

# 3. Config repo — ya en Git (no necesita backup adicional)

# 4. Cleanup de backups antiguos
aws s3 ls s3://$BACKUP_BUCKET/postgresql/ | \
  awk '{print $2}' | \
  sort | head -n -$RETENTION_DAYS | \
  xargs -I {} aws s3 rm s3://$BACKUP_BUCKET/postgresql/{} --recursive

echo "Backup completed: $TIMESTAMP"
```

```yaml
# K8s CronJob para backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sdoc-backup
  namespace: sdoc-production
spec:
  schedule: "0 2 * * *"  # 2 AM diariamente
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: ghcr.io/sdoc-platform/backup-job:latest
              envFrom:
                - secretRef:
                    name: backup-secrets
              command: ["/scripts/backup.sh"]
```

---

## RESUMEN FINAL — QUÉ CUBRE EL DOCUMENTO COMPLETO

### Patrones de Arquitectura ✅
- Microservicios con database-per-service
- Spring Cloud (Config Server, Eureka, Gateway, OpenFeign, LoadBalancer)
- Resilience4j completo (CB, Retry, Bulkhead, TimeLimiter, RateLimiter)
- **Outbox Pattern** (garantía de consistencia DB ↔ Kafka)
- **CQRS** (separación lecturas/escrituras con vistas materializadas)
- **Saga Pattern** (transacciones distribuidas via Choreography)
- **API Versioning** (URL path + header + deprecation headers)
- **Feature Flags** (Unleash self-hosted)
- **Multitenancy** (shared + schema-per-enterprise-tenant)

### Event-Driven ✅
- Kafka con 9 topics + DLQs por topic
- **Schema Registry + Avro** (contratos de eventos versionados)
- Kafka producers idempotentes (exactly-once semantics)
- Consumer groups con manual acknowledgment
- Dead Letter Queue monitoring

### Seguridad Enterprise ✅
- HashiCorp Vault (todos los secretos)
- mTLS entre microservicios
- Keycloak OAuth2/OIDC
- OPA policies (autorización granular)
- AES-256-GCM + HKDF (cifrado por documento)
- Ed25519 (firmas digitales)
- Audit log inmutable

### Infraestructura ✅
- Docker Compose completo (22 servicios)
- **Kubernetes** con Helm charts
- **HPA** (escala por CPU/memoria)
- **KEDA** (escala render-worker por longitud de cola)
- **PodDisruptionBudgets** (zero-downtime maintenance)
- **NetworkPolicies** (aislamiento de red)
- **ResourceQuotas + LimitRanges**
- **External Secrets Operator** (Vault → K8s Secrets)
- **ArgoCD GitOps** (despliegue declarativo)

### Observabilidad ✅
- Prometheus + Alertmanager (métricas + alertas críticas)
- Grafana (dashboards)
- Loki + Promtail (logs centralizados)
- Jaeger + OpenTelemetry (distributed tracing)
- **Structured JSON logging** (logback + logstash-encoder)
- **MDC enrichment** (userId, requestId, tenantId en todos los logs)
- Health indicators personalizados

### Compliance y Operaciones ✅
- **GDPR** (borrado completo de datos + exportación portabilidad)
- **Backup automatizado** (PostgreSQL + Vault → S3)
- K8s CronJob para backups
- Runbook por alerta

### Performance ✅
- **Virtual Threads** Java 21 (Project Loom)
- Redis caché multinivel
- Vistas materializadas PostgreSQL (CQRS read model)
- CDN para assets

---

*SDOC Platform — Master Build Prompt v2.1 Enterprise Final*
*Auditoría exhaustiva completada — Mayo 2025*
*Fuente única de verdad para construcción de 0 a producción real*

---

# SUPLEMENTO v2.2 — COMPONENTES FALTANTES CRÍTICOS (CONTINUACIÓN)

---

## COMPONENTE O: SPRING CLOUD STREAM — Abstracción sobre Kafka

Spring Cloud Stream provee una capa de abstracción sobre Kafka que simplifica producers/consumers usando interfaces funcionales Java. Más testeable y menos boilerplate que KafkaTemplate directo.

```kotlin
// Agregar a build.gradle.kts de servicios que publican/consumen mucho
implementation("org.springframework.cloud:spring-cloud-starter-stream-kafka")
```

```java
// En notification-service: consumer funcional sin @KafkaListener
@Configuration
public class NotificationStreamConfig {

    // Consumer funcional — Spring Cloud Stream lo conecta al topic automáticamente
    @Bean
    public Consumer<Message<DocumentCreatedEvent>> documentCreated(
        NotificationService notificationService
    ) {
        return message -> {
            DocumentCreatedEvent event = message.getPayload();
            String correlationId = message.getHeaders()
                .getOrDefault("correlationId", "unknown").toString();

            try (MDCCloseable ignored = MDC.putCloseable("correlationId", correlationId)) {
                notificationService.sendDocumentCreatedNotification(event);
            }
        };
    }

    @Bean
    public Consumer<Message<UserRegisteredEvent>> userRegistered(
        NotificationService notificationService
    ) {
        return message -> notificationService.sendWelcomeEmail(message.getPayload());
    }

    // Supplier = Producer reactivo — emite eventos periódicamente
    @Bean
    public Supplier<Flux<NotificationEvent>> scheduledNotifications(
        NotificationScheduler scheduler
    ) {
        return scheduler::getScheduledNotifications;
    }
}
```

```yaml
# config-repo/notification-service.yml
spring:
  cloud:
    stream:
      kafka:
        binder:
          brokers: ${KAFKA_BROKERS:kafka:9092}
          auto-create-topics: false
          consumer-properties:
            max.poll.records: 50
            max.poll.interval.ms: 300000
      bindings:
        # Consumer: documentCreated-in-0 mapea al @Bean "documentCreated"
        documentCreated-in-0:
          destination: sdoc.documents.created
          group: notification-service-group
          consumer:
            max-attempts: 3
            back-off-initial-interval: 1000
            back-off-max-interval: 10000
            back-off-multiplier: 2.0
            default-retryable: true
        
        userRegistered-in-0:
          destination: sdoc.users.registered
          group: notification-service-group
        
        # Dead letter binding automático
        documentCreated-in-0.dlq:
          destination: sdoc.documents.created.dlq
          group: notification-dlq-group
```

---

## COMPONENTE P: SPRING SECURITY — Configuración Completa por Servicio

Cada microservicio tiene su propia config de seguridad. No depender del gateway para todo.

```java
// Patrón base de SecurityConfig para TODOS los servicios Java
// services/[nombre]/src/main/java/app/sdoc/[nombre]/config/SecurityConfig.java

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)  // @PreAuthorize en métodos
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            .authorizeHttpRequests(auth -> auth
                // Actuator health — público (para K8s probes)
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/actuator/info").permitAll()
                // Métricas — solo desde dentro del cluster (Prometheus)
                .requestMatchers("/actuator/prometheus").hasIpAddress("10.0.0.0/8")
                // Todo lo demás — autenticado
                .anyRequest().authenticated()
            )
            
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            
            // Headers de seguridad
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> xss.disable())  // Manejado por CSP
                .contentSecurityPolicy(csp ->
                    csp.policyDirectives("default-src 'self'"))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
            )
            
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
            )
            
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter =
            new JwtGrantedAuthoritiesConverter();
        // Extraer roles del claim "roles" en Keycloak
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        // Extraer userId del subject del JWT
        converter.setPrincipalClaimName("sub");
        return converter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

// Uso de @PreAuthorize en controladores
@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public DocumentResponse getDocument(@PathVariable UUID id, Authentication auth) {
        return documentService.getDocument(id, auth.getName()); // auth.getName() = userId (sub)
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public void deleteDocument(@PathVariable UUID id, Authentication auth) {
        documentService.deleteDocument(id, auth.getName());
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminStatsResponse getAdminStats() {
        return documentService.getAdminStats();
    }
}
```

---

## COMPONENTE Q: FLYWAY — MIGRACIONES COMPLETAS POR SERVICIO

Cada servicio Java gestiona sus propias migraciones con Flyway. Nunca `ddl-auto: create` en producción.

```
services/document-service/src/main/resources/db/migration/
├── V001__initial_schema.sql           ← Schema inicial completo
├── V002__outbox_table.sql             ← Outbox pattern
├── V003__read_model_views.sql         ← Vistas CQRS
├── V004__add_ai_fields.sql            ← Campos para AI features (futura)
├── V005__indexes_optimization.sql     ← Índices de optimización
└── R__document_search_function.sql    ← Repeatable: función FTS (se aplica si cambia)
```

```sql
-- V005__indexes_optimization.sql
-- Índices adicionales basados en análisis de queries lentas

-- Para el dashboard: ordenar por updated_at con filtros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_owner_updated
    ON documents(owner_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Para búsqueda por tags (GIN para arrays)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tags_gin
    ON documents USING GIN(tags)
    WHERE deleted_at IS NULL;

-- Para documentos públicos (selectividad alta)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_public_active
    ON documents(updated_at DESC)
    WHERE is_public = TRUE AND deleted_at IS NULL;

-- Para la tabla outbox (polling frecuente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_pending_batch
    ON outbox_events(created_at ASC)
    WHERE status = 'PENDING'
    INCLUDE (id, topic, payload, aggregate_id);

-- Para audit log (consultas de compliance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_resource_time
    ON audit_log(resource_type, resource_id, occurred_at DESC)
    INCLUDE (action, actor_id, success);

-- Partial index para documentos en colaboración activa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_sync_enabled
    ON documents(id)
    WHERE sync_enabled = TRUE AND deleted_at IS NULL;
```

```yaml
# Configuración Flyway en config-repo/application.yml (global)
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false
    validate-on-migrate: true
    out-of-order: false
    clean-disabled: true       # NUNCA limpiar en producción
    placeholders:
      schema: public
    # Tabla de historial de migraciones
    table: flyway_schema_history
    # Encoding
    encoding: UTF-8
```

---

## COMPONENTE R: OPENAPI / SWAGGER — Documentación de APIs

Cada servicio expone su OpenAPI spec. El Gateway agrega todas en un portal unificado.

```java
// Agregar a build.gradle.kts:
// implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.5.0")

// services/document-service/src/main/java/app/sdoc/document/config/OpenApiConfig.java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sdocOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("SDOC Document Service API")
                .description("API de gestión de documentos SDOC")
                .version("v1.0.0")
                .contact(new Contact()
                    .name("SDOC Platform")
                    .email("api@sdoc.app")
                    .url("https://sdoc.app"))
                .license(new License()
                    .name("Proprietary")
                    .url("https://sdoc.app/terms")))
            .externalDocs(new ExternalDocumentation()
                .description("SDOC Platform Documentation")
                .url("https://docs.sdoc.app"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT token desde Keycloak")));
    }
}

// Documentar endpoints con anotaciones OpenAPI
@RestController
@RequestMapping("/api/v1/documents")
@Tag(name = "Documents", description = "Gestión de documentos SDOC")
@RequiredArgsConstructor
public class DocumentController {

    @Operation(
        summary = "Crear documento",
        description = "Crea un nuevo documento vacío. Requiere plan FREE o superior.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Documento creado",
                content = @Content(schema = @Schema(implementation = DocumentResponse.class))),
            @ApiResponse(responseCode = "402", description = "Límite de plan alcanzado",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "No autenticado")
        }
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse createDocument(
        @Valid @RequestBody CreateDocumentRequest request,
        @Parameter(hidden = true) @RequestHeader("X-User-Id") String userId
    ) {
        return documentService.createDocument(request, userId);
    }

    @Operation(summary = "Listar documentos del usuario",
        parameters = {
            @Parameter(name = "page", description = "Página (0-indexed)", example = "0"),
            @Parameter(name = "size", description = "Elementos por página", example = "20"),
            @Parameter(name = "sort", description = "Campo de ordenamiento", example = "updatedAt,desc")
        })
    @GetMapping
    public Page<DocumentSummaryResponse> listDocuments(
        @RequestHeader("X-User-Id") String userId,
        @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC)
        Pageable pageable
    ) {
        return documentQueryService.getDashboard(userId, pageable);
    }
}
```

```yaml
# config-repo/application.yml — configuración global Swagger
springdoc:
  api-docs:
    enabled: true
    path: /api-docs
  swagger-ui:
    enabled: true
    path: /swagger-ui.html
    operations-sorter: method
    tags-sorter: alpha
    display-request-duration: true
    try-it-out-enabled: false   # Deshabilitar en producción
  show-actuator: false
  default-produces-media-type: application/json

# En producción: deshabilitar Swagger UI (solo api-docs para clientes)
# springdoc.swagger-ui.enabled: false
```

---

## COMPONENTE S: EXCEPTION HANDLING GLOBAL

Un handler de excepciones consistente en todos los servicios. La respuesta de error debe ser siempre el mismo formato.

```java
// shared/java-commons/src/main/java/app/sdoc/commons/exception/

// Excepciones de dominio base
public abstract class SdocException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus httpStatus;
    
    protected SdocException(String errorCode, String message, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }
}

public class DocumentNotFoundException extends SdocException {
    public DocumentNotFoundException(UUID id) {
        super("DOCUMENT_NOT_FOUND",
              "El documento " + id + " no existe o fue eliminado",
              HttpStatus.NOT_FOUND);
    }
}

public class AccessDeniedException extends SdocException {
    public AccessDeniedException(String action) {
        super("ACCESS_DENIED",
              "No tienes permiso para realizar la acción: " + action,
              HttpStatus.FORBIDDEN);
    }
}

public class PlanLimitException extends SdocException {
    public PlanLimitException(String feature) {
        super("PLAN_LIMIT_EXCEEDED",
              "La función '" + feature + "' requiere un plan superior",
              HttpStatus.PAYMENT_REQUIRED);
    }
}

public class DocumentIntegrityException extends SdocException {
    public DocumentIntegrityException(String message) {
        super("DOCUMENT_INTEGRITY_ERROR", message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

// GlobalExceptionHandler — aplicar en TODOS los servicios
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(SdocException.class)
    public ResponseEntity<ErrorResponse> handleSdocException(
        SdocException ex, HttpServletRequest request
    ) {
        log.warn("Business exception: code={} message={} path={}",
            ex.getErrorCode(), ex.getMessage(), request.getRequestURI());
        
        return ResponseEntity
            .status(ex.getHttpStatus())
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code(ex.getErrorCode())
                    .message(ex.getMessage())
                    .build())
                .meta(Meta.of(request))
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException ex, HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = ex.getBindingResult()
            .getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Inválido"
            ));

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code("VALIDATION_ERROR")
                    .message("Hay errores de validación en la solicitud")
                    .details(fieldErrors)
                    .build())
                .meta(Meta.of(request))
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
        Exception ex, HttpServletRequest request
    ) {
        // Log completo del error interno — NO exponer al cliente
        String errorId = UUID.randomUUID().toString();
        log.error("Unhandled exception [errorId={}]: {}", errorId, ex.getMessage(), ex);
        
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse.builder()
                .success(false)
                .error(ErrorDetail.builder()
                    .code("INTERNAL_ERROR")
                    .message("Error interno del servidor. ID de referencia: " + errorId)
                    .build())
                .meta(Meta.of(request))
                .build());
    }
}

// Formato estándar de respuesta de error
@Data @Builder
public class ErrorResponse {
    private boolean success;
    private ErrorDetail error;
    private Meta meta;
}

@Data @Builder
public class ErrorDetail {
    private String code;
    private String message;
    private Map<String, Object> details;
}

@Data @Builder
public class Meta {
    private String requestId;
    private String timestamp;
    private String path;
    
    public static Meta of(HttpServletRequest request) {
        return Meta.builder()
            .requestId(request.getHeader("X-Request-Id"))
            .timestamp(Instant.now().toString())
            .path(request.getRequestURI())
            .build();
    }
}
```

---

## COMPONENTE T: RENDER SERVICE PYTHON — COMPLETO

```python
# services/render-service/app/main.py
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.routers import export, preview, imports
from app.eureka_client import register_with_eureka
from prometheus_fastapi_instrumentator import Instrumentator
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("render-service starting up")
    await register_with_eureka()
    yield
    # Shutdown
    logger.info("render-service shutting down")

app = FastAPI(
    title="SDOC Render Service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None
)

# Middlewares
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Routers
app.include_router(export.router, prefix="/api/v1/render", tags=["Export"])
app.include_router(preview.router, prefix="/api/v1/render", tags=["Preview"])
app.include_router(imports.router, prefix="/api/v1/render", tags=["Import"])

@app.get("/actuator/health/liveness")
async def liveness(): return {"status": "UP"}

@app.get("/actuator/health/readiness")
async def readiness():
    # Verificar conexión a Redis (Celery broker)
    try:
        from app.worker import celery_app
        celery_app.control.inspect().ping(timeout=2)
        return {"status": "UP", "celery": "UP"}
    except Exception as e:
        raise HTTPException(503, detail={"status": "DOWN", "celery": str(e)})


# services/render-service/app/converters/sdoc_to_html.py
from typing import Any
import re

class SdocToHtmlConverter:
    """Convierte contenido SDOC JSON a HTML para posterior conversión a PDF."""

    CSS_BASE = """
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; font-size: 11pt; line-height: 1.6;
               color: #1a1a1a; background: white; }
        .page { width: 794px; min-height: 1123px; margin: 0 auto;
                padding: 72px; page-break-after: always; }
        h1 { font-size: 24pt; font-weight: 700; margin: 16px 0 8px; color: #111; }
        h2 { font-size: 18pt; font-weight: 600; margin: 14px 0 6px; color: #222; }
        h3 { font-size: 14pt; font-weight: 600; margin: 12px 0 4px; }
        p  { margin-bottom: 8px; }
        img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        pre { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px;
              padding: 16px; overflow-x: auto; font-family: 'Courier New', monospace;
              font-size: 9pt; margin: 12px 0; }
        blockquote { border-left: 4px solid #6366f1; padding-left: 16px;
                     margin: 12px 0; color: #555; font-style: italic; }
        ul, ol { margin: 8px 0 8px 24px; }
        li { margin-bottom: 4px; }
        strong { font-weight: 700; }
        em { font-style: italic; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px;
               font-family: monospace; font-size: 9pt; }
        @media print {
            .page { margin: 0; page-break-after: always; }
        }
    """

    def convert(self, content: dict, options: dict = None) -> str:
        options = options or {}
        pages_html = []

        for page in content.get("pages", []):
            elements_html = []
            for element in page.get("elements", []):
                elements_html.append(self._convert_element(element))
            pages_html.append(
                f'<div class="page">{"".join(elements_html)}</div>'
            )

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{options.get('title', 'Documento SDOC')}</title>
    <style>{self.CSS_BASE}</style>
</head>
<body>
    {"".join(pages_html)}
</body>
</html>"""

    def _convert_element(self, element: dict) -> str:
        elem_type = element.get("type", "paragraph")

        converters = {
            "heading":    self._heading,
            "paragraph":  self._paragraph,
            "image":      self._image,
            "table":      self._table,
            "codeblock":  self._codeblock,
            "blockquote": self._blockquote,
            "list":       self._list,
            "divider":    lambda e: "<hr/>",
        }

        converter = converters.get(elem_type)
        if converter:
            return converter(element)

        return f'<!-- Unsupported element type: {elem_type} -->'

    def _heading(self, element: dict) -> str:
        level = element.get("attrs", {}).get("level", 1)
        text = self._render_children(element.get("children", []))
        return f"<h{level}>{text}</h{level}>"

    def _paragraph(self, element: dict) -> str:
        text = self._render_children(element.get("children", []))
        if not text.strip():
            return "<p>&nbsp;</p>"
        align = element.get("style", {}).get("alignment", "left")
        return f'<p style="text-align:{align}">{text}</p>'

    def _image(self, element: dict) -> str:
        src = element.get("src", "")
        alt = element.get("alt", "")
        width = element.get("width", "")
        style = f"width:{width}px" if width else "max-width:100%"
        return f'<img src="{src}" alt="{alt}" style="{style}"/>'

    def _table(self, element: dict) -> str:
        rows_html = []
        for i, row in enumerate(element.get("rows", [])):
            cells_html = []
            for cell in row.get("cells", []):
                tag = "th" if i == 0 else "td"
                content = self._render_children(cell.get("children", []))
                cells_html.append(f"<{tag}>{content}</{tag}>")
            rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
        return f"<table><tbody>{''.join(rows_html)}</tbody></table>"

    def _codeblock(self, element: dict) -> str:
        language = element.get("language", "")
        content = element.get("content", "")
        import html
        return f'<pre><code class="language-{language}">{html.escape(content)}</code></pre>'

    def _blockquote(self, element: dict) -> str:
        text = self._render_children(element.get("children", []))
        return f"<blockquote>{text}</blockquote>"

    def _list(self, element: dict) -> str:
        ordered = element.get("ordered", False)
        tag = "ol" if ordered else "ul"
        items = "".join(
            f"<li>{self._render_children(item.get('children', []))}</li>"
            for item in element.get("items", [])
        )
        return f"<{tag}>{items}</{tag}>"

    def _render_children(self, children: list) -> str:
        result = []
        for child in children:
            if child.get("type") == "text":
                text = child.get("content", "")
                marks = child.get("marks", [])
                if "bold" in marks:      text = f"<strong>{text}</strong>"
                if "italic" in marks:    text = f"<em>{text}</em>"
                if "underline" in marks: text = f"<u>{text}</u>"
                if "code" in marks:      text = f"<code>{text}</code>"
                if "strike" in marks:    text = f"<s>{text}</s>"
                result.append(text)
            elif child.get("type") == "link":
                href = child.get("href", "#")
                inner = self._render_children(child.get("children", []))
                result.append(f'<a href="{href}">{inner}</a>')
        return "".join(result)


# services/render-service/app/converters/html_to_pdf.py
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import logging

logger = logging.getLogger(__name__)

class HtmlToPdfConverter:

    def __init__(self, options: dict = None):
        self.options = options or {}
        self.font_config = FontConfiguration()

    def convert(self, html_content: str, base_url: str = None) -> bytes:
        try:
            css_print = CSS(string="""
                @page {
                    size: A4;
                    margin: 0;
                }
                body { margin: 0; }
            """, font_config=self.font_config)

            pdf = HTML(
                string=html_content,
                base_url=base_url or "https://sdoc.app"
            ).write_pdf(
                stylesheets=[css_print],
                font_config=self.font_config,
                presentational_hints=True
            )

            logger.info(f"PDF generated: {len(pdf)} bytes")
            return pdf

        except Exception as e:
            logger.error(f"PDF generation failed: {e}")
            raise


# services/render-service/app/tasks/preview_generator.py
from celery import shared_task
from PIL import Image
import io

@shared_task(bind=True, max_retries=2)
def generate_preview_task(self, document_id: str):
    """Genera thumbnail.webp y preview.html para un documento."""
    try:
        content = fetch_document_content(document_id)

        # 1. Generar HTML preview
        from app.converters.sdoc_to_html import SdocToHtmlConverter
        html = SdocToHtmlConverter().convert(content, {"title": "Preview"})
        html_key = f"previews/{document_id}/preview.html"
        upload_to_storage(html_key, html.encode(), "text/html")

        # 2. Generar thumbnail (400x300 WebP)
        from app.converters.html_to_pdf import HtmlToPdfConverter
        pdf_bytes = HtmlToPdfConverter().convert(html)

        import fitz  # PyMuPDF
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf_doc[0]
        mat = fitz.Matrix(1.5, 1.5)  # 150% zoom para calidad
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img.thumbnail((400, 300), Image.LANCZOS)

        webp_buffer = io.BytesIO()
        img.save(webp_buffer, "WEBP", quality=85, method=6)
        webp_bytes = webp_buffer.getvalue()

        thumb_key = f"previews/{document_id}/thumbnail.webp"
        upload_to_storage(thumb_key, webp_bytes, "image/webp")

        return {"status": "success", "html_key": html_key, "thumb_key": thumb_key}

    except Exception as exc:
        logger.error(f"Preview generation failed for {document_id}: {exc}")
        raise self.retry(exc=exc, countdown=30)
```

---

## COMPONENTE U: FRONTEND COMPLETO — React + Estado + Offline

### Estructura de Stores Zustand

```typescript
// apps/web/src/stores/documentStore.ts
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Document, DocumentContent, DocumentStatus } from '@/types'

interface DocumentState {
  // Estado del documento activo en el editor
  activeDocument: Document | null
  isDirty: boolean               // Cambios no guardados
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null

  // Estado de colaboración
  collaborators: CollaboratorInfo[]
  isCollaborating: boolean

  // Acciones
  setActiveDocument: (doc: Document) => void
  updateContent: (content: DocumentContent) => void
  markDirty: () => void
  markSaved: () => void
  setSaving: (saving: boolean) => void
  addCollaborator: (collaborator: CollaboratorInfo) => void
  removeCollaborator: (userId: string) => void
  reset: () => void
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        activeDocument: null,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        saveError: null,
        collaborators: [],
        isCollaborating: false,

        setActiveDocument: (doc) => set(state => {
          state.activeDocument = doc
          state.isDirty = false
          state.lastSavedAt = new Date(doc.updatedAt)
        }),

        updateContent: (content) => set(state => {
          if (state.activeDocument) {
            state.activeDocument.content = content
            state.isDirty = true
          }
        }),

        markDirty: () => set(state => { state.isDirty = true }),

        markSaved: () => set(state => {
          state.isDirty = false
          state.isSaving = false
          state.lastSavedAt = new Date()
          state.saveError = null
        }),

        setSaving: (saving) => set(state => { state.isSaving = saving }),

        addCollaborator: (collaborator) => set(state => {
          const exists = state.collaborators.some(c => c.userId === collaborator.userId)
          if (!exists) {
            state.collaborators.push(collaborator)
            state.isCollaborating = state.collaborators.length > 0
          }
        }),

        removeCollaborator: (userId) => set(state => {
          state.collaborators = state.collaborators.filter(c => c.userId !== userId)
          state.isCollaborating = state.collaborators.length > 0
        }),

        reset: () => set(state => {
          state.activeDocument = null
          state.isDirty = false
          state.isSaving = false
          state.collaborators = []
          state.isCollaborating = false
        })
      }))
    ),
    { name: 'document-store' }
  )
)

// Auto-save: guardar cada 30s si hay cambios
useDocumentStore.subscribe(
  state => ({ isDirty: state.isDirty, activeDocument: state.activeDocument }),
  async ({ isDirty, activeDocument }) => {
    if (isDirty && activeDocument) {
      // El auto-save se maneja en el hook useAutoSave
    }
  }
)
```

```typescript
// apps/web/src/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react'
import { useDocumentStore } from '@/stores/documentStore'
import { useOfflineStore } from '@/stores/offlineStore'
import { documentApi } from '@/services/api'

const AUTO_SAVE_DELAY_MS = 3000  // 3 segundos después de dejar de escribir

export function useAutoSave(documentId: string) {
  const { isDirty, activeDocument, setSaving, markSaved } = useDocumentStore()
  const { isOnline } = useOfflineStore()
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    if (!isDirty || !activeDocument) return

    setSaving(true)

    try {
      if (isOnline) {
        // Online: guardar en servidor
        await documentApi.updateContent(documentId, activeDocument.content)
        markSaved()
      } else {
        // Offline: guardar en IndexedDB
        await saveDocumentOffline({
          ...activeDocument,
          isDirty: true,
          updatedAt: new Date().toISOString()
        })
        markSaved()
      }
    } catch (error) {
      useDocumentStore.setState({ saveError: 'Error al guardar. Reintentando...' })
      // Guardar offline como fallback
      await saveDocumentOffline({ ...activeDocument!, isDirty: true, updatedAt: new Date().toISOString() })
    } finally {
      setSaving(false)
    }
  }, [isDirty, activeDocument, isOnline, documentId])

  // Debounce: esperar N ms después del último cambio para guardar
  useEffect(() => {
    if (!isDirty) return

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(save, AUTO_SAVE_DELAY_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [isDirty, save])

  // Guardar antes de cerrar la pestaña
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        save() // Intento síncrono
        e.preventDefault()
        e.returnValue = 'Tienes cambios sin guardar. ¿Salir de todas formas?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, save])

  return { save }
}
```

```typescript
// apps/web/src/hooks/useOfflineSync.ts
import { useEffect } from 'react'
import { useOfflineStore } from '@/stores/offlineStore'
import { getDirtyDocuments, markDocumentSynced } from '@/services/offline'
import { documentApi } from '@/services/api'

/**
 * Detecta reconexión y sincroniza documentos modificados offline.
 */
export function useOfflineSync() {
  const { setOnline } = useOfflineStore()

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true)
      console.log('[OfflineSync] Back online — starting sync...')

      const dirtyDocuments = await getDirtyDocuments()
      console.log(`[OfflineSync] Found ${dirtyDocuments.length} dirty documents`)

      for (const doc of dirtyDocuments) {
        try {
          await documentApi.updateContent(doc.id, doc.content)
          await markDocumentSynced(doc.id)
          console.log(`[OfflineSync] Synced document: ${doc.id}`)
        } catch (error) {
          console.error(`[OfflineSync] Failed to sync document ${doc.id}:`, error)
          // Dejar como dirty — se intentará en el próximo ciclo
        }
      }
    }

    const handleOffline = () => {
      setOnline(false)
      console.log('[OfflineSync] Gone offline — activating local mode')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Estado inicial
    setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])
}
```

```typescript
// apps/web/src/services/api.ts — Cliente HTTP tipado

import axios, { type AxiosInstance } from 'axios'
import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  })

  // Request interceptor: añadir JWT y request ID
  client.interceptors.request.use(async config => {
    if (keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30)
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`
    config.headers['X-Request-Id'] = crypto.randomUUID()
    config.headers['Idempotency-Key'] = config.method !== 'GET'
      ? crypto.randomUUID()
      : undefined
    return config
  })

  // Response interceptor: manejo de errores uniforme
  client.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 401) {
        await keycloak.login()
        return
      }
      if (error.response?.status === 402) {
        // Redirigir a upgrade plan
        window.location.href = '/settings/billing'
        return
      }
      // Reintentar 503 una vez
      if (error.response?.status === 503 && !error.config._retry) {
        error.config._retry = true
        await new Promise(resolve => setTimeout(resolve, 2000))
        return client(error.config)
      }
      return Promise.reject(error)
    }
  )

  return client
}

const apiClient = createApiClient()

export const documentApi = {
  list: (params: { page: number; size: number }) =>
    apiClient.get('/api/v1/documents', { params }),

  get: (id: string) =>
    apiClient.get(`/api/v1/documents/${id}`),

  create: (data: { title: string; language?: string }) =>
    apiClient.post('/api/v1/documents', data),

  updateContent: (id: string, content: object) =>
    apiClient.put(`/api/v1/documents/${id}/content`, { content }),

  updateMeta: (id: string, data: Partial<{ title: string; tags: string[] }>) =>
    apiClient.put(`/api/v1/documents/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/documents/${id}`),

  search: (query: string, tags?: string[]) =>
    apiClient.get('/api/v1/documents/search', { params: { q: query, tags } }),

  requestExport: (id: string, format: string) =>
    apiClient.post('/api/v1/render/export', { documentId: id, format }),

  getExportJob: (jobId: string) =>
    apiClient.get(`/api/v1/render/jobs/${jobId}`),
}

export const assetApi = {
  upload: (file: File, documentId: string, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentId', documentId)
    return apiClient.post('/api/v1/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: event => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total))
        }
      },
    })
  },
}

export { keycloak }
```

---

## COMPONENTE V: NGINX — CONFIGURACIÓN COMPLETA DE PRODUCCIÓN

```nginx
# infrastructure/docker/nginx/nginx.conf

worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # ============================================================
    # CONFIGURACIÓN BASE
    # ============================================================
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;   # No exponer versión de Nginx
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # ============================================================
    # LOGGING ESTRUCTURADO JSON
    # ============================================================
    log_format json_combined escape=json
        '{'
            '"time":"$time_iso8601",'
            '"remote_addr":"$remote_addr",'
            '"method":"$request_method",'
            '"uri":"$uri",'
            '"status":$status,'
            '"body_bytes":$body_bytes_sent,'
            '"request_time":$request_time,'
            '"http_referer":"$http_referer",'
            '"http_user_agent":"$http_user_agent",'
            '"request_id":"$http_x_request_id",'
            '"upstream_addr":"$upstream_addr",'
            '"upstream_response_time":"$upstream_response_time"'
        '}';
    
    access_log /var/log/nginx/access.log json_combined;
    error_log /var/log/nginx/error.log warn;
    
    # ============================================================
    # COMPRESIÓN
    # ============================================================
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/json application/javascript application/xml
        application/rss+xml font/woff font/woff2
        image/svg+xml;
    
    # ============================================================
    # RATE LIMITING A NIVEL NGINX (primera capa)
    # ============================================================
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    
    # ============================================================
    # UPSTREAM POOLS
    # ============================================================
    upstream api_gateway {
        server api-gateway:8080;
        keepalive 32;
    }
    
    upstream web_app {
        server web:3000;
        keepalive 16;
    }
    
    # ============================================================
    # SERVIDOR PRINCIPAL
    # ============================================================
    server {
        listen 80;
        server_name sdoc.app www.sdoc.app;
        
        # Redirigir todo a HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name sdoc.app www.sdoc.app;
        
        # TLS — certificados (Let's Encrypt en producción)
        ssl_certificate     /etc/nginx/ssl/sdoc.crt;
        ssl_certificate_key /etc/nginx/ssl/sdoc.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # Tamaño máximo de upload
        client_max_body_size 150M;
        client_body_timeout 120s;
        client_header_timeout 30s;
        
        # Límite de conexiones por IP
        limit_conn conn_limit 100;
        
        # ---- Cabeceras de seguridad ----
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob: cdn.sdoc.app; connect-src 'self' wss://sdoc.app;" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
        
        # ---- Frontend ----
        location / {
            proxy_pass http://web_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Cache assets estáticos del frontend
            location ~* \.(js|css|png|webp|woff2|ico)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                proxy_pass http://web_app;
            }
        }
        
        # ---- API Gateway ----
        location /api/ {
            limit_req zone=api_limit burst=200 nodelay;
            
            proxy_pass http://api_gateway;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 60s;  # Más largo para exports
            
            # Headers de trazabilidad
            proxy_set_header X-Request-Id $request_id;
        }
        
        # ---- Auth endpoints — rate limiting más estricto ----
        location /api/v1/auth/ {
            limit_req zone=auth_limit burst=10 nodelay;
            proxy_pass http://api_gateway;
            proxy_http_version 1.1;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # ---- Uploads ----
        location /api/v1/assets/upload {
            limit_req zone=upload_limit burst=5;
            client_max_body_size 150M;
            proxy_pass http://api_gateway;
            proxy_read_timeout 300s;  # Uploads grandes pueden tardar
        }
        
        # ---- WebSocket para sync ----
        location /ws/ {
            proxy_pass http://api_gateway;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;  # WebSockets de larga duración
            proxy_send_timeout 3600s;
        }
        
        # ---- Health check — sin logs ----
        location /health {
            access_log off;
            return 200 '{"status":"ok"}';
            add_header Content-Type application/json;
        }
    }
}
```

---

## COMPONENTE W: VARIABLES DE ENTORNO — .env DEFINITIVO

```bash
# .env.example — COMPLETO v2.1
# Copiar como .env y completar TODOS los valores antes de ejecutar
# NUNCA commitear .env al repositorio

# ============================================================
# ENTORNO
# ============================================================
ENVIRONMENT=development

# ============================================================
# POSTGRESQL
# ============================================================
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=sdoc
POSTGRES_PASSWORD=CAMBIAR_MINIMO_32_CHARS_ALEATORIO
POSTGRES_DB=sdoc_db

# ============================================================
# REDIS
# ============================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CAMBIAR_MINIMO_32_CHARS_ALEATORIO

# ============================================================
# KAFKA
# ============================================================
KAFKA_BROKERS=kafka:9092
KAFKA_SCHEMA_REGISTRY_URL=http://schema-registry:8081

# ============================================================
# MINIO / S3
# ============================================================
MINIO_ROOT_USER=sdoc_admin
MINIO_ROOT_PASSWORD=CAMBIAR_MINIMO_32_CHARS
MINIO_URL=http://minio:9000
# Producción: usar Cloudflare R2 o AWS S3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET_DOCUMENTS=sdoc-documents-prod
# AWS_S3_BUCKET_ASSETS=sdoc-assets-prod
# CLOUDFLARE_R2_ACCOUNT_ID=
# CLOUDFLARE_R2_ACCESS_KEY=
# CLOUDFLARE_R2_SECRET_KEY=

# ============================================================
# HASHICORP VAULT
# ============================================================
VAULT_HOST=vault
VAULT_PORT=8200
VAULT_DEV_TOKEN=CAMBIAR_EN_PROD_usar_AppRole_no_dev_token

# Vault AppRole (producción — NO usar dev token)
# GATEWAY_VAULT_ROLE_ID=
# GATEWAY_VAULT_SECRET_ID=
# AUTH_VAULT_ROLE_ID=
# AUTH_VAULT_SECRET_ID=
# DOCUMENT_VAULT_ROLE_ID=
# DOCUMENT_VAULT_SECRET_ID=
# SYNC_VAULT_ROLE_ID=
# SYNC_VAULT_SECRET_ID=
# ASSET_VAULT_ROLE_ID=
# ASSET_VAULT_SECRET_ID=
# VERSION_VAULT_ROLE_ID=
# VERSION_VAULT_SECRET_ID=
# NOTIFICATION_VAULT_ROLE_ID=
# NOTIFICATION_VAULT_SECRET_ID=

# ============================================================
# KEYCLOAK
# ============================================================
KEYCLOAK_HOST=keycloak
KEYCLOAK_PORT=8090
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=CAMBIAR_MINIMO_20_CHARS
KEYCLOAK_REALM=sdoc
KEYCLOAK_CLIENT_ID_WEB=sdoc-web
KEYCLOAK_CLIENT_ID_BACKEND=sdoc-backend
KEYCLOAK_CLIENT_SECRET=CAMBIAR_UUID_ALEATORIO

# ============================================================
# CONFIG SERVER
# ============================================================
CONFIG_SERVER_USER=config-admin
CONFIG_SERVER_PASSWORD=CAMBIAR_CONFIG_SERVER_PASS
CONFIG_ENCRYPT_KEY=CAMBIAR_32_CHARS_AES_KEY
CONFIG_REPO_URI=file:///config-repo

# ============================================================
# EUREKA
# ============================================================
EUREKA_USER=eureka-admin
EUREKA_PASSWORD=CAMBIAR_EUREKA_PASS
EUREKA_HOSTNAME=eureka

# ============================================================
# SEGURIDAD / CIFRADO
# ============================================================
JWT_SECRET=CAMBIAR_MINIMO_64_CHARS_BASE64
ENCRYPTION_MASTER_KEY=CAMBIAR_32_BYTES_BASE64
HKDF_SALT=CAMBIAR_32_BYTES_BASE64
ED25519_PRIVATE_KEY=CAMBIAR_KEY_BASE64
ED25519_PUBLIC_KEY=CAMBIAR_KEY_BASE64

# ============================================================
# UNLEASH (Feature Flags)
# ============================================================
UNLEASH_ADMIN_PASSWORD=CAMBIAR_UNLEASH_PASS
UNLEASH_CLIENT_KEY=CAMBIAR_UNLEASH_API_KEY

# ============================================================
# EMAIL (Resend)
# ============================================================
RESEND_API_KEY=re_CAMBIAR_API_KEY
EMAIL_FROM=noreply@sdoc.app
EMAIL_FROM_NAME=SDOC Platform

# ============================================================
# STRIPE (Monetización)
# ============================================================
STRIPE_SECRET_KEY=sk_live_CAMBIAR
STRIPE_WEBHOOK_SECRET=whsec_CAMBIAR
STRIPE_PRICE_PRO_MONTHLY=price_CAMBIAR
STRIPE_PRICE_PRO_YEARLY=price_CAMBIAR
STRIPE_PRICE_ENTERPRISE=price_CAMBIAR

# ============================================================
# OBSERVABILIDAD
# ============================================================
GRAFANA_PASSWORD=CAMBIAR_GRAFANA_PASS
SONAR_TOKEN=CAMBIAR_SONAR_TOKEN
SONAR_HOST_URL=http://localhost:9000

# ============================================================
# FEATURE FLAGS (Unleash)
# ============================================================
UNLEASH_URL=http://unleash:4242/api
UNLEASH_CLIENT_KEY=CAMBIAR_CLIENT_KEY

# ============================================================
# URLS (desarrollo local)
# ============================================================
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8080
WS_URL=ws://localhost:8085

# ============================================================
# LÍMITES DE PLANES
# ============================================================
FREE_PLAN_MAX_DOCUMENTS=10
FREE_PLAN_STORAGE_BYTES=1073741824       # 1 GB
FREE_PLAN_MAX_EXPORTS_PER_MONTH=5

PRO_PLAN_MAX_DOCUMENTS=-1               # Ilimitados
PRO_PLAN_STORAGE_BYTES=53687091200      # 50 GB
PRO_PLAN_MAX_EXPORTS_PER_MONTH=-1       # Ilimitados
PRO_PLAN_MAX_COLLABORATORS=10

ENTERPRISE_PLAN_STORAGE_BYTES=-1        # Ilimitado
ENTERPRISE_PLAN_MAX_COLLABORATORS=-1

# ============================================================
# RENDER SERVICE
# ============================================================
MAX_UPLOAD_SIZE_MB=150
PDF_GENERATION_TIMEOUT_SECONDS=120
OCR_ENABLED=false
OCR_LANGUAGE=spa+eng

# ============================================================
# BACKUP
# ============================================================
BACKUP_BUCKET=sdoc-backups
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=CAMBIAR_BACKUP_KEY
```

---

## APÉNDICE FINAL — ORDEN DE CONSTRUCCIÓN RECOMENDADO

La IA que use este documento DEBE seguir este orden exacto. No saltar pasos.

```
BLOQUE 1 — Infraestructura base (sin código de negocio)
  ✅ 1. Monorepo + turbo.json + Gradle multi-project
  ✅ 2. .env configurado con TODOS los valores
  ✅ 3. Docker Compose — arrancar: postgres, redis, kafka, zookeeper, vault, minio
  ✅ 4. vault-init.sh — crear todos los secretos
  ✅ 5. PostgreSQL — ejecutar init.sql (schema completo)
  ✅ 6. Kafka — crear todos los topics y DLQs
  ✅ 7. Keycloak — importar realm-export.json (realm sdoc configurado)
  ✅ 8. MinIO — crear buckets via minio-init
  ✅ 9. Schema Registry — verificar funcionando

BLOQUE 2 — Spring Cloud Infrastructure
  ✅ 10. config-server — arrancar, verificar que expone /actuator/health
  ✅ 11. config-repo — crear application.yml y yml de cada servicio
  ✅ 12. eureka-server — arrancar, verificar dashboard en :8761
  ✅ 13. Verificar que config-server aparece en Eureka

BLOQUE 3 — Microservicios core (en este orden)
  ✅ 14. auth-service — registro y login funcionando
  ✅ 15. api-gateway — rutas, JWT validation, rate limiting
  ✅ 16. document-service — CRUD completo + Outbox + CQRS
  ✅ 17. asset-service — upload/download funcionando
  ✅ 18. version-service — snapshots funcionando
  ✅ 19. sync-service — WebSocket + Yjs
  ✅ 20. notification-service — email en registro funcionando
  ✅ 21. render-service — exportar PDF funciona E2E

BLOQUE 4 — Frontend
  ✅ 22. Auth flow con Keycloak (login/logout)
  ✅ 23. Dashboard — listar documentos
  ✅ 24. Editor TipTap básico — crear y editar
  ✅ 25. Auto-save funcionando
  ✅ 26. Offline básico (Service Worker)
  ✅ 27. Colaboración en tiempo real (Yjs)
  ✅ 28. Export flow E2E (request → Kafka → Celery → download)

BLOQUE 5 — Observabilidad y Hardening
  ✅ 29. Prometheus scrapeando todos los servicios
  ✅ 30. Grafana dashboards configurados
  ✅ 31. Loki recibiendo logs JSON
  ✅ 32. Jaeger mostrando trazas E2E
  ✅ 33. Alertas críticas configuradas en Alertmanager

BLOQUE 6 — Monetización
  ✅ 34. Stripe webhooks funcionando
  ✅ 35. Feature flags por plan en Unleash
  ✅ 36. Límites por plan implementados y probados

BLOQUE 7 — Producción
  ✅ 37. Helm charts completos
  ✅ 38. HPA + KEDA + PDB configurados
  ✅ 39. NetworkPolicies aplicadas
  ✅ 40. ArgoCD GitOps configurado
  ✅ 41. Backup CronJob funcionando
  ✅ 42. HTTPS con Let's Encrypt
  ✅ 43. Load testing (k6) pasado sin degradación
  ✅ 44. Checklist de producción del Componente 22 completado
```

---

*SDOC Platform — Master Build Prompt v2.2 Enterprise FINAL DEFINITIVO*
*6.000+ líneas · 200KB+ · 22 componentes enterprise cubiertos*
*Auditoría externa completada — patrones verificados contra producción real*
*Mayo 2025 — Santiago Aguilar Torres / Metatech*