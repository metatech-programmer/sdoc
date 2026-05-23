#!/usr/bin/env bash
# ============================================================
# Folio · Script de verificación pre-deploy
# Corre desde la raíz del repo: ./scripts/verify.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()    { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
info()  { echo -e "  $1"; }

echo ""
echo "==========================================================="
echo "  Folio · Verificación pre-deploy"
echo "==========================================================="
echo ""

# ----- 1. Estructura básica -----
echo "📁 Verificando estructura del proyecto..."
[ -f README.md ]               && ok "README.md"               || fail "README.md falta"
[ -f LICENSE ]                 && ok "LICENSE"                 || fail "LICENSE falta"
[ -f CONTRIBUTING.md ]         && ok "CONTRIBUTING.md"         || fail "CONTRIBUTING.md falta"
[ -f SECURITY.md ]             && ok "SECURITY.md"             || fail "SECURITY.md falta"
[ -f CODE_OF_CONDUCT.md ]      && ok "CODE_OF_CONDUCT.md"      || fail "CODE_OF_CONDUCT.md falta"
[ -f DEPLOY.md ]               && ok "DEPLOY.md"               || fail "DEPLOY.md falta"
[ -f .gitignore ]              && ok ".gitignore"              || fail ".gitignore falta"
[ -d .github/ISSUE_TEMPLATE ]  && ok ".github/ISSUE_TEMPLATE"  || fail ".github/ISSUE_TEMPLATE falta"
[ -d release ]                 && ok "release/"                || warn "release/ falta"

# ----- 2. Frontend -----
echo ""
echo "🎨 Verificando frontend..."
[ -f apps/web/package.json ]                       && ok "package.json"   || fail "package.json frontend falta"
[ -f apps/web/index.html ]                         && ok "index.html"     || fail "index.html falta"
[ -f apps/web/src/main.tsx ]                       && ok "main.tsx"       || fail "main.tsx falta"
[ -f apps/web/src/App.tsx ]                        && ok "App.tsx"        || fail "App.tsx falta"
[ -f apps/web/src/index.css ]                      && ok "index.css"      || fail "index.css falta"
[ -f apps/web/public/logo.svg ]                    && ok "logo.svg"       || fail "logo falta"
[ -f apps/web/public/favicon.svg ]                 && ok "favicon.svg"    || fail "favicon falta"
[ -f apps/web/public/manifest.webmanifest ]        && ok "manifest"       || fail "manifest falta"
[ -f apps/web/public/robots.txt ]                  && ok "robots.txt"     || fail "robots falta"
[ -f apps/web/public/sitemap.xml ]                 && ok "sitemap.xml"    || fail "sitemap falta"
[ -f apps/web/src/lib/i18n.ts ]                    && ok "i18n.ts"        || fail "i18n falta"
[ -f apps/web/src/lib/theme.ts ]                   && ok "theme.ts"       || fail "theme falta"
[ -f apps/web/src/lib/format.ts ]                  && ok "format.ts"      || fail "format falta"
[ -f apps/web/src/lib/validators.ts ]              && ok "validators.ts"  || fail "validators falta"

# ----- 3. i18n locales -----
echo ""
echo "🌐 Verificando i18n..."
[ -f apps/web/src/i18n/locales/es-CO.ts ]  && ok "es-CO"  || fail "es-CO locale falta"
[ -f apps/web/src/i18n/locales/en.ts ]     && ok "en"     || fail "en locale falta"
[ -f apps/web/src/i18n/locales/pt-BR.ts ]  && ok "pt-BR"  || fail "pt-BR locale falta"

# ----- 4. Deploy configs -----
echo ""
echo "🚀 Verificando configuraciones de deploy..."
[ -f vercel.json ]                && ok "vercel.json"             || warn "vercel.json falta"
[ -f netlify.toml ]               && ok "netlify.toml"            || warn "netlify.toml falta"
[ -f render.yaml ]                && ok "render.yaml"             || warn "render.yaml falta"
[ -f railway.toml ]               && ok "railway.toml"            || warn "railway.toml falta"
[ -f fly.toml ]                   && ok "fly.toml"                || warn "fly.toml falta"
[ -f docker-compose.demo.yml ]    && ok "docker-compose.demo.yml" || warn "docker-compose.demo falta"

# ----- 5. Release kit -----
echo ""
echo "📢 Verificando release kit..."
[ -f release/LINKEDIN_KIT.md ]     && ok "LINKEDIN_KIT"     || warn "LINKEDIN_KIT falta"
[ -f release/GITHUB_RELEASE.md ]   && ok "GITHUB_RELEASE"   || warn "GITHUB_RELEASE falta"
[ -f release/PRODUCT_HUNT.md ]     && ok "PRODUCT_HUNT"     || warn "PRODUCT_HUNT falta"
[ -f release/PRESS_KIT.md ]        && ok "PRESS_KIT"        || warn "PRESS_KIT falta"

# ----- 6. TU_USUARIO sin reemplazar -----
echo ""
echo "🔍 Buscando placeholders sin reemplazar..."
if grep -rl "TU_USUARIO" --include="*.md" --include="*.yml" --include="*.json" . 2>/dev/null | head -1 > /dev/null; then
  warn "Hay archivos con 'TU_USUARIO' sin reemplazar. Lista:"
  grep -rl "TU_USUARIO" --include="*.md" --include="*.yml" --include="*.json" . 2>/dev/null | head -10 | sed 's/^/  → /'
  info "Reemplaza con: grep -rl TU_USUARIO . | xargs sed -i 's/TU_USUARIO/tu-github-user/g'"
else
  ok "Sin placeholders pendientes"
fi

# ----- 7. Build del frontend -----
echo ""
echo "🏗️  Verificando build del frontend..."
if command -v node >/dev/null 2>&1; then
  ok "Node.js instalado ($(node --version))"
  if [ -d apps/web/node_modules ]; then
    ok "node_modules presente"
  else
    warn "node_modules falta. Corre: npm install --workspaces --include-workspace-root"
  fi
else
  warn "Node.js no instalado. Necesitas Node 20+."
fi

echo ""
echo "==========================================================="
echo -e "  ${GREEN}✓ Verificación completada${NC}"
echo "==========================================================="
echo ""
echo "Próximos pasos:"
echo "  1. Reemplaza TU_USUARIO en todos los archivos"
echo "  2. cd apps/web && npm install && npm run build"
echo "  3. Toma screenshots reales y guárdalos en release/screenshots/"
echo "  4. Inicializa git: git init && git add . && git commit -m 'feat: initial public release'"
echo "  5. Crea repo en GitHub: gh repo create folio --public --source=. --push"
echo "  6. Deploy: vercel --prod"
echo "  7. Publica en LinkedIn usando release/LINKEDIN_KIT.md"
echo ""
