#!/usr/bin/env bash
# ============================================================
# SDOC · Script de verificación pre-deploy
# Corre desde la raíz del repo: ./scripts/verify.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()    { echo -e "${GREEN}OK${NC}   $1"; }
fail()  { echo -e "${RED}FAIL${NC} $1"; exit 1; }
warn()  { echo -e "${YELLOW}WARN${NC} $1"; }

echo ""
echo "==========================================================="
echo "  SDOC · Verificación pre-deploy"
echo "==========================================================="
echo ""

# ----- 1. Documentación gobernanza -----
echo "[1/6] Gobernanza para IA / contribuidores..."
[ -f AGENTS.md ]                       && ok "AGENTS.md"                  || fail "AGENTS.md falta"
[ -f CLAUDE.md ]                       && ok "CLAUDE.md"                  || fail "CLAUDE.md falta"
[ -f SPEC.md ]                         && ok "SPEC.md"                    || fail "SPEC.md falta"
[ -f .cursorrules ]                    && ok ".cursorrules"               || warn ".cursorrules falta"
[ -f .github/copilot-instructions.md ] && ok "copilot-instructions.md"    || warn "copilot-instructions.md falta"
[ -f docs/PROJECT_OVERVIEW.md ]        && ok "docs/PROJECT_OVERVIEW.md"   || fail "PROJECT_OVERVIEW.md falta"
[ -f docs/FORMAT_SPEC_INDEX.md ]       && ok "docs/FORMAT_SPEC_INDEX.md"  || fail "FORMAT_SPEC_INDEX.md falta"
[ -f docs/AI_TASK_PROTOCOL.md ]        && ok "docs/AI_TASK_PROTOCOL.md"   || fail "AI_TASK_PROTOCOL.md falta"

# ----- 2. Estructura base -----
echo ""
echo "[2/6] Estructura base..."
[ -f README.md ]               && ok "README.md"               || fail "README.md falta"
[ -f LICENSE ]                 && ok "LICENSE"                 || fail "LICENSE falta"
[ -f CONTRIBUTING.md ]         && ok "CONTRIBUTING.md"         || fail "CONTRIBUTING.md falta"
[ -f SECURITY.md ]             && ok "SECURITY.md"             || fail "SECURITY.md falta"
[ -f CODE_OF_CONDUCT.md ]      && ok "CODE_OF_CONDUCT.md"      || fail "CODE_OF_CONDUCT.md falta"
[ -f DEPLOY.md ]               && ok "DEPLOY.md"               || fail "DEPLOY.md falta"
[ -f .gitignore ]              && ok ".gitignore"              || fail ".gitignore falta"
[ -d .github/ISSUE_TEMPLATE ]  && ok ".github/ISSUE_TEMPLATE"  || fail ".github/ISSUE_TEMPLATE falta"

# ----- 3. Frontend -----
echo ""
echo "[3/6] Frontend..."
[ -f apps/web/package.json ]                       && ok "package.json"   || fail "package.json frontend falta"
[ -f apps/web/index.html ]                         && ok "index.html"     || fail "index.html falta"
[ -f apps/web/src/main.tsx ]                       && ok "main.tsx"       || fail "main.tsx falta"
[ -f apps/web/src/App.tsx ]                        && ok "App.tsx"        || fail "App.tsx falta"
[ -f apps/web/src/index.css ]                      && ok "index.css"      || fail "index.css falta"
[ -f apps/web/public/logo.svg ]                    && ok "logo.svg"       || fail "logo falta"
[ -f apps/web/public/favicon.svg ]                 && ok "favicon.svg"    || fail "favicon falta"
[ -f apps/web/public/manifest.webmanifest ]        && ok "manifest"       || fail "manifest falta"
[ -f apps/web/public/robots.txt ]                  && ok "robots.txt"     || fail "robots falta"
[ -f apps/web/src/lib/i18n.ts ]                    && ok "i18n.ts"        || fail "i18n falta"
[ -f apps/web/src/lib/theme.ts ]                   && ok "theme.ts"       || fail "theme falta"
[ -f apps/web/src/lib/format.ts ]                  && ok "format.ts"      || fail "format falta"
[ -f apps/web/src/lib/validators.ts ]              && ok "validators.ts"  || fail "validators falta"

# ----- 4. i18n -----
echo ""
echo "[4/6] i18n locales..."
[ -f apps/web/src/i18n/locales/es-CO.ts ]  && ok "es-CO"  || fail "es-CO locale falta"
[ -f apps/web/src/i18n/locales/en.ts ]     && ok "en"     || fail "en locale falta"
[ -f apps/web/src/i18n/locales/pt-BR.ts ]  && ok "pt-BR"  || fail "pt-BR locale falta"

# ----- 5. Deploy configs -----
echo ""
echo "[5/6] Deploy configs..."
[ -f vercel.json ]                && ok "vercel.json"             || warn "vercel.json falta"
[ -f netlify.toml ]               && ok "netlify.toml"            || warn "netlify.toml falta"
[ -f render.yaml ]                && ok "render.yaml"             || warn "render.yaml falta"
[ -f railway.toml ]               && ok "railway.toml"            || warn "railway.toml falta"
[ -f fly.toml ]                   && ok "fly.toml"                || warn "fly.toml falta"
[ -f docker-compose.demo.yml ]    && ok "docker-compose.demo.yml" || warn "docker-compose.demo falta"

# ----- 6. Node + node_modules -----
echo ""
echo "[6/6] Build prerequisitos..."
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
echo -e "  ${GREEN}Verificación completada${NC}"
echo "==========================================================="
echo ""
echo "Próximos pasos:"
echo "  1. npm install --workspaces --include-workspace-root"
echo "  2. npm run build -w apps/web"
echo "  3. npm run dev -w apps/web (modo demo, sin backend)"
echo "  4. git add . && git commit -m 'feat: ...'"
echo "  5. git push origin main"
echo "  6. vercel --prod (opcional, deploy a producción)"
echo ""
