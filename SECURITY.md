# Política de seguridad

## Versiones soportadas

| Versión | Soportada |
|---------|-----------|
| 1.x     | ✅ activa |
| < 1.0   | ❌ EoL |

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad en SDOC, **NO** abras un issue público.

### Cómo reportar

1. Usa **[GitHub Security Advisories](../../security/advisories/new)** — es la forma privada y recomendada.
   Incluye:
   - Descripción del problema
   - Pasos para reproducir
   - Impacto potencial
   - Solución sugerida (si la tienes)

2. Recibirás respuesta en **48–72 horas**.
3. Te mantendremos informado del progreso y daremos crédito en el changelog (a menos que prefieras anonimato).

### Compromiso

- Confirmación en 24h
- Evaluación inicial en 72h
- Parche en 7 días para críticas, 30 días para no críticas
- Disclosure coordinado tras el parche

## Hall of Fame

Reconocemos públicamente a quienes reportan vulnerabilidades válidas:

| Reporter | Vulnerabilidad | Fecha |
|----------|----------------|-------|
| _(vacío)_ | — | — |

## Buenas prácticas para usuarios

Si auto-hosteas SDOC:

- ✅ Usa HTTPS siempre (Vercel/Render/Cloudflare lo dan gratis).
- ✅ Rota `JWT_SECRET` periódicamente (`openssl rand -base64 32`).
- ✅ Activa MFA en Keycloak.
- ✅ Mantén SDOC actualizado: `git pull && docker compose up -d --build`.
- ✅ Backup diario de Postgres (Neon lo hace automático).
- ❌ No publiques tu `.env` en GitHub.
- ❌ No uses passwords débiles en cuentas admin.

## Cumplimiento

Folio implementa:

- **GDPR (UE)** — Art. 17 (derecho al olvido), Art. 20 (portabilidad)
- **Habeas Data (Colombia)** — Ley 1581 de 2012
- **CCPA (California)** — derechos básicos del consumidor

Para auditorías de seguridad o cumplimiento, abre un issue con la etiqueta `compliance`.
