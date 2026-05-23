# Contribuir a Folio

¡Gracias por considerar contribuir a Folio! 🎉 Esta guía te ayudará a hacerlo de forma efectiva.

---

## Cómo contribuir

### 🐛 Reportar bugs

1. Busca primero en [issues abiertos](../../issues) por si alguien ya lo reportó.
2. Si no existe, abre uno usando la [plantilla de bug](.github/ISSUE_TEMPLATE/bug.md).
3. Incluye: pasos para reproducir, comportamiento esperado vs. real, screenshots si aplica, versión de navegador/SO.

### ✨ Proponer features

1. Abre un issue con la [plantilla de feature request](.github/ISSUE_TEMPLATE/feature.md).
2. Describe el problema que resuelve (no la solución).
3. Espera feedback antes de empezar a codear — para no duplicar esfuerzo.

### 🔧 Enviar PRs

1. **Fork** el repo y crea una rama: `git checkout -b feat/mi-mejora`.
2. **Codea** siguiendo las convenciones del proyecto (ver abajo).
3. **Verifica** que la app corre: `npm run dev -w apps/web` y abre `localhost:3000`.
4. **Commit** con mensajes en formato Conventional Commits:
   - `feat: agregar exportación a Markdown`
   - `fix: corregir scroll en editor móvil`
   - `docs: actualizar DEPLOY.md`
5. **Push** y abre el PR usando la plantilla.

---

## Setup local

```bash
# Clonar y entrar
git clone https://github.com/metatech-programmer/folio.git
cd folio

# Instalar deps
npm install --workspaces --include-workspace-root

# Modo demo (frontend solo, sin backend)
npm run dev -w apps/web

# Stack mínimo con Docker
docker compose -f docker-compose.demo.yml up -d
```

---

## Convenciones de código

### Frontend (TypeScript/React)

- **Componentes**: PascalCase (`PricingSection.tsx`), un componente por archivo.
- **Hooks**: camelCase con prefijo `use` (`useAutoSave`).
- **CSS Modules**: `Component.module.css` junto al `Component.tsx`.
- **i18n**: todo texto visible debe estar en `src/i18n/locales/*.ts`.
- **Iconos**: SVG inline desde `src/components/ui/Icon.tsx`. **No emojis**.
- **Accesibilidad**: WCAG AA mínimo. Focus visible, ARIA labels, contraste 4.5:1.
- **Responsive**: probar en 375px, 768px, 1024px, 1440px.
- **Sin librerías de UI grandes** (no Material UI, Chakra, Mantine). Mantenemos el bundle ligero.

### Backend (Java/Spring)

- **Java 21+** con virtual threads habilitados.
- **Spring Boot 3.3+** convenciones (`@RestController`, `@Service`, `@Repository`).
- **Tests**: JUnit 5 + Testcontainers para integración.
- **Naming**: paquetes en `app.sdoc.<servicio>` (legado), nuevos en `app.folio.<servicio>`.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nueva funcionalidad
fix:      bug fix
docs:     documentación
style:    formato (no afecta código)
refactor: refactor sin cambio de comportamiento
perf:     mejora de performance
test:     agregar/corregir tests
chore:    tareas de mantenimiento (deps, config, etc.)
```

---

## Code of Conduct

Lee [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). En resumen: **sé amable, sé profesional, asume buenas intenciones.**

---

## Preguntas

- [Discussions](../../discussions) para preguntas generales
- [Issues](../../issues) para bugs y features
- Para temas privados, usa la sección **Security** del repo

¡Gracias por hacer Folio mejor! 💙
