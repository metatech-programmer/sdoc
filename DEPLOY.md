# SDOC · Guía de despliegue

SDOC se puede desplegar en **5 minutos** usando solo planes gratuitos. Esta guía cubre las combinaciones recomendadas.

---

## TL;DR — La combinación más sencilla

| Capa | Servicio | Costo | Tiempo |
|---|---|---|---|
| Frontend | **Vercel** | Gratis | 2 min |
| API Gateway | **Render** Web Service | Gratis (sleep tras 15 min inactividad) | 5 min |
| PostgreSQL | **Neon** | Gratis (0.5 GB) | 2 min |
| Redis | **Upstash** | Gratis (10 K cmd/día) | 2 min |
| Object storage | **Backblaze B2** o **Cloudflare R2** | Gratis (10 GB) | 5 min |

**Total: ~15 minutos para tener SDOC en producción con dominio público.**

---

## Opción A — Demo standalone (sin backend, ~3 minutos)

El editor incluye **modo demo automático**: si el backend no responde, la app funciona con datos seed locales. Útil para mostrar el producto sin levantar todo el stack.

```bash
# 1. Clona
git clone https://github.com/metatech-programmer/sdoc.git
cd sdoc

# 2. Instala dependencias y compila web
npm install --workspaces --include-workspace-root
cd apps/web
npm run build

# 3. Despliega a Vercel
npm i -g vercel
vercel --prod
```

Listo. URL pública en <2 minutos. El demo mode se activa solo si no hay backend.

---

## Opción B — Stack completo gratuito

### 1. Frontend → Vercel

```bash
# Desde la raíz del repo
vercel --prod
```

Variables de entorno a configurar en el dashboard de Vercel:

```
VITE_API_URL=https://sdoc-api.onrender.com/api/v1
VITE_WS_URL=wss://sdoc-api.onrender.com/ws/sync
```

### 2. PostgreSQL → Neon

1. Crea cuenta en [neon.tech](https://neon.tech) (gratis, sin tarjeta).
2. Crea proyecto `sdoc-prod`.
3. Copia la connection string (la usarás en el siguiente paso).

### 3. Redis → Upstash

1. Crea cuenta en [upstash.com](https://upstash.com).
2. Crea database Redis llamado `sdoc-cache` en la región más cercana.
3. Copia el `UPSTASH_REDIS_URL`.

### 4. API Gateway → Render

1. Conecta tu repo de GitHub en [render.com](https://render.com).
2. Render detecta automáticamente `render.yaml`.
3. Configura estas variables en el dashboard:

```
POSTGRES_URL=<la connection string de Neon>
REDIS_URL=<la URL de Upstash>
JWT_SECRET=<genera con openssl rand -base64 32>
KEYCLOAK_URL=<opcional para demo, requerido para auth real>
```

4. Click "Deploy" → ~5 min.

### 5. Object Storage → Cloudflare R2

1. Cuenta en [cloudflare.com](https://cloudflare.com).
2. R2 → Create bucket `sdoc-assets`.
3. Genera API token con permiso `Object Read/Write`.
4. Variables:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=sdoc-assets
S3_ACCESS_KEY=<tu access key>
S3_SECRET_KEY=<tu secret>
```

---

## Opción C — Railway (todo en uno)

Railway puede correr backend + Postgres + Redis bajo un solo proyecto con free trial.

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

Railway detecta `railway.toml` y `Dockerfile.gateway` automáticamente.

---

## Opción D — Fly.io (latencia desde Bogotá)

Fly tiene región `bog` (Bogotá) para latencia mínima en Colombia/LATAM.

```bash
flyctl launch --copy-config --name sdoc-api
flyctl postgres create --name sdoc-pg --region bog
flyctl redis create --name sdoc-redis --region bog
flyctl deploy
```

---

## Variables de entorno completas

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=https://api.tudominio.com/api/v1
VITE_WS_URL=wss://api.tudominio.com/ws/sync
VITE_DEMO_MODE=false
VITE_BRAND_NAME=SDOC
VITE_SUPPORT_EMAIL=hola@tudominio.com
```

### Backend (gateway + servicios)

```env
# Database
POSTGRES_URL=postgres://user:pass@host:5432/sdoc_db
REDIS_URL=redis://default:pass@host:6379

# Auth (opcional para demo, requerido en prod)
KEYCLOAK_URL=https://auth.tudominio.com
JWT_SECRET=<openssl rand -base64 32>

# Object Storage
S3_ENDPOINT=https://account.r2.cloudflarestorage.com
S3_BUCKET=sdoc-assets
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Email (opcional)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@tudominio.com

# Pagos Colombia (opcional)
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...

# Pagos global (opcional)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## Costos estimados a escala

| Usuarios activos / mes | Costo mensual |
|---|---|
| 0 – 100 | **$0** (todo gratis) |
| 100 – 1.000 | $0 – $5 (Vercel Pro opcional) |
| 1.000 – 10.000 | $25 – $50 (Neon Pro + Upstash Pro) |
| 10.000+ | Migra a AWS/GCP — guía aparte |

---

## Dominio personalizado

1. Compra en [Namecheap](https://namecheap.com) (~$10/año) o [Cloudflare Registrar](https://cloudflare.com/products/registrar/) (al costo).
2. Apunta DNS:
   - `A` y `AAAA` → IPs de Vercel (auto)
   - `CNAME api` → `<tu-app>.onrender.com`
3. Vercel y Render generan certificados SSL automáticamente.

---

## Verificación post-deploy

```bash
# Frontend
curl -I https://tudominio.com
# Espera: 200, headers de seguridad, cache-control

# API health
curl https://api.tudominio.com/actuator/health
# Espera: {"status":"UP"}

# Lighthouse
npx lighthouse https://tudominio.com --view
# Esperado: Performance >90, A11y >95, SEO 100
```

---

## Troubleshooting

### El frontend muestra "modo demo" aunque tengo backend

Tu `VITE_API_URL` apunta a una URL que no responde. Verifica:

```bash
curl https://api.tudominio.com/api/v1/auth/login -I
# Si timeout o 404 → el frontend activa demo automáticamente
```

### Render se duerme y la primera carga es lenta

Free tier hace sleep tras 15 min. Soluciones:
- Upgrade a Render Starter ($7/mes).
- Cron-job.org ping cada 14 min (gratis).
- Migra a Fly.io que tiene `min_machines_running = 0` con cold start <2s.

### Lighthouse score <90 en mobile

Verifica que `vite-plugin-pwa` esté generando el service worker y que las fuentes Google se cacheen.

---

## Stack alternativo: 100% self-hosted

¿Prefieres servidor propio? Usa Coolify o Dokploy en un VPS Hetzner (€4/mes):

```bash
# En tu VPS
curl -fsSL https://coolify.io/install.sh | bash
# Conecta el repo, Coolify detecta docker-compose y despliega todo
```
