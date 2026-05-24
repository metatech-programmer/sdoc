# ============================================================
# SDOC · Script de verificación pre-deploy (Windows PowerShell)
# Corre desde la raíz del repo: ./scripts/verify.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Test-File($path, $name) {
    if (Test-Path $path) {
        Write-Host "  [OK] $name" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [!!] $name falta" -ForegroundColor Red
        return $false
    }
}

function Test-FileWarn($path, $name) {
    if (Test-Path $path) {
        Write-Host "  [OK] $name" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [WARN] $name falta" -ForegroundColor Yellow
        return $false
    }
}

Write-Host ""
Write-Host "==========================================================="
Write-Host "  SDOC - Verificacion pre-deploy"
Write-Host "==========================================================="
Write-Host ""

Write-Host "[1/6] Gobernanza para IA / contribuidores..." -ForegroundColor Cyan
Test-File "AGENTS.md" "AGENTS.md"
Test-File "CLAUDE.md" "CLAUDE.md"
Test-File "SPEC.md" "SPEC.md"
Test-FileWarn ".cursorrules" ".cursorrules"
Test-FileWarn ".github/copilot-instructions.md" "copilot-instructions.md"
Test-File "docs/PROJECT_OVERVIEW.md" "docs/PROJECT_OVERVIEW.md"
Test-File "docs/FORMAT_SPEC_INDEX.md" "docs/FORMAT_SPEC_INDEX.md"
Test-File "docs/AI_TASK_PROTOCOL.md" "docs/AI_TASK_PROTOCOL.md"

Write-Host ""
Write-Host "[2/6] Estructura base..." -ForegroundColor Cyan
Test-File "README.md" "README.md"
Test-File "LICENSE" "LICENSE"
Test-File "CONTRIBUTING.md" "CONTRIBUTING.md"
Test-File "SECURITY.md" "SECURITY.md"
Test-File "CODE_OF_CONDUCT.md" "CODE_OF_CONDUCT.md"
Test-File "DEPLOY.md" "DEPLOY.md"
Test-File ".gitignore" ".gitignore"
Test-File ".github/ISSUE_TEMPLATE" ".github/ISSUE_TEMPLATE"

Write-Host ""
Write-Host "[3/6] Frontend..." -ForegroundColor Cyan
Test-File "apps/web/package.json" "package.json"
Test-File "apps/web/index.html" "index.html"
Test-File "apps/web/src/main.tsx" "main.tsx"
Test-File "apps/web/src/App.tsx" "App.tsx"
Test-File "apps/web/src/index.css" "index.css"
Test-File "apps/web/public/logo.svg" "logo.svg"
Test-File "apps/web/public/favicon.svg" "favicon.svg"
Test-File "apps/web/public/manifest.webmanifest" "manifest"
Test-File "apps/web/public/robots.txt" "robots.txt"
Test-File "apps/web/src/lib/i18n.ts" "i18n.ts"
Test-File "apps/web/src/lib/theme.ts" "theme.ts"
Test-File "apps/web/src/lib/format.ts" "format.ts"
Test-File "apps/web/src/lib/validators.ts" "validators.ts"

Write-Host ""
Write-Host "[4/6] i18n locales..." -ForegroundColor Cyan
Test-File "apps/web/src/i18n/locales/es-CO.ts" "es-CO"
Test-File "apps/web/src/i18n/locales/en.ts" "en"
Test-File "apps/web/src/i18n/locales/pt-BR.ts" "pt-BR"

Write-Host ""
Write-Host "[5/6] Deploy configs..." -ForegroundColor Cyan
Test-FileWarn "vercel.json" "vercel.json"
Test-FileWarn "netlify.toml" "netlify.toml"
Test-FileWarn "render.yaml" "render.yaml"
Test-FileWarn "railway.toml" "railway.toml"
Test-FileWarn "fly.toml" "fly.toml"
Test-FileWarn "docker-compose.demo.yml" "docker-compose.demo.yml"

Write-Host ""
Write-Host "[6/6] Build prerequisitos..." -ForegroundColor Cyan
$node = (Get-Command node -ErrorAction SilentlyContinue)
if ($node) {
    $v = & node --version
    Write-Host "  [OK] Node.js instalado ($v)" -ForegroundColor Green
    if (Test-Path "apps/web/node_modules") {
        Write-Host "  [OK] node_modules presente" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] node_modules falta. Corre: npm install --workspaces --include-workspace-root" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] Node.js no instalado. Necesitas Node 20+." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================="
Write-Host "  Verificacion completada" -ForegroundColor Green
Write-Host "==========================================================="
Write-Host ""
Write-Host "Proximos pasos:"
Write-Host "  1. npm install --workspaces --include-workspace-root"
Write-Host "  2. npm run build -w apps/web"
Write-Host "  3. npm run dev -w apps/web   (modo demo, sin backend)"
Write-Host "  4. git add . ; git commit -m 'feat: ...'"
Write-Host "  5. git push origin main"
Write-Host "  6. vercel --prod   (opcional, deploy a produccion)"
Write-Host ""
