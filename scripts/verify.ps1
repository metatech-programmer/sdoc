# ============================================================
# Folio · Script de verificación pre-deploy (Windows PowerShell)
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
Write-Host "  Folio - Verificacion pre-deploy"
Write-Host "==========================================================="
Write-Host ""

Write-Host "[1/6] Estructura del proyecto..." -ForegroundColor Cyan
Test-File "README.md" "README.md"
Test-File "LICENSE" "LICENSE"
Test-File "CONTRIBUTING.md" "CONTRIBUTING.md"
Test-File "SECURITY.md" "SECURITY.md"
Test-File "CODE_OF_CONDUCT.md" "CODE_OF_CONDUCT.md"
Test-File "DEPLOY.md" "DEPLOY.md"
Test-File ".gitignore" ".gitignore"
Test-File ".github/ISSUE_TEMPLATE" ".github/ISSUE_TEMPLATE"
Test-FileWarn "release" "release/"

Write-Host ""
Write-Host "[2/6] Frontend..." -ForegroundColor Cyan
Test-File "apps/web/package.json" "package.json"
Test-File "apps/web/index.html" "index.html"
Test-File "apps/web/src/main.tsx" "main.tsx"
Test-File "apps/web/src/App.tsx" "App.tsx"
Test-File "apps/web/src/index.css" "index.css"
Test-File "apps/web/public/logo.svg" "logo.svg"
Test-File "apps/web/public/favicon.svg" "favicon.svg"
Test-File "apps/web/public/manifest.webmanifest" "manifest"
Test-File "apps/web/public/robots.txt" "robots.txt"
Test-File "apps/web/public/sitemap.xml" "sitemap.xml"
Test-File "apps/web/src/lib/i18n.ts" "i18n.ts"
Test-File "apps/web/src/lib/theme.ts" "theme.ts"
Test-File "apps/web/src/lib/format.ts" "format.ts"
Test-File "apps/web/src/lib/validators.ts" "validators.ts"

Write-Host ""
Write-Host "[3/6] i18n locales..." -ForegroundColor Cyan
Test-File "apps/web/src/i18n/locales/es-CO.ts" "es-CO"
Test-File "apps/web/src/i18n/locales/en.ts" "en"
Test-File "apps/web/src/i18n/locales/pt-BR.ts" "pt-BR"

Write-Host ""
Write-Host "[4/6] Deploy configs..." -ForegroundColor Cyan
Test-FileWarn "vercel.json" "vercel.json"
Test-FileWarn "netlify.toml" "netlify.toml"
Test-FileWarn "render.yaml" "render.yaml"
Test-FileWarn "railway.toml" "railway.toml"
Test-FileWarn "fly.toml" "fly.toml"
Test-FileWarn "docker-compose.demo.yml" "docker-compose.demo.yml"

Write-Host ""
Write-Host "[5/6] Release kit..." -ForegroundColor Cyan
Test-FileWarn "release/LINKEDIN_KIT.md" "LINKEDIN_KIT"
Test-FileWarn "release/GITHUB_RELEASE.md" "GITHUB_RELEASE"
Test-FileWarn "release/PRODUCT_HUNT.md" "PRODUCT_HUNT"
Test-FileWarn "release/PRESS_KIT.md" "PRESS_KIT"

Write-Host ""
Write-Host "[6/6] Placeholders sin reemplazar..." -ForegroundColor Cyan
$matches = Get-ChildItem -Recurse -Include *.md,*.yml,*.json -ErrorAction SilentlyContinue |
    Select-String -Pattern "TU_USUARIO" -List |
    Select-Object -ExpandProperty Path -First 10
if ($matches) {
    Write-Host "  [WARN] Archivos con TU_USUARIO sin reemplazar:" -ForegroundColor Yellow
    $matches | ForEach-Object { Write-Host "         -> $_" -ForegroundColor Yellow }
    Write-Host "  Reemplaza con tu usuario real antes de publicar." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Sin placeholders pendientes" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================="
Write-Host "  Verificacion completada" -ForegroundColor Green
Write-Host "==========================================================="
Write-Host ""
Write-Host "Proximos pasos:"
Write-Host "  1. Reemplaza TU_USUARIO en todos los archivos"
Write-Host "  2. cd apps/web ; npm install ; npm run build"
Write-Host "  3. Toma screenshots reales (release/screenshots/)"
Write-Host "  4. git init ; git add . ; git commit -m 'feat: initial public release'"
Write-Host "  5. gh repo create folio --public --source=. --push"
Write-Host "  6. vercel --prod"
Write-Host "  7. Publica en LinkedIn usando release/LINKEDIN_KIT.md"
Write-Host ""
