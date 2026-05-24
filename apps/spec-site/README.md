# @sdoc/spec-site

Sitio estático con la especificación pública del formato `.sdoc`.

URL pública (una vez activado GitHub Pages): **https://metatech-programmer.github.io/sdoc/**

## Estructura

```
apps/spec-site/
├── build.mjs              # Generador estático (Node ESM, sin frameworks)
├── package.json
└── dist/                  # Output (no se commitea, lo genera GitHub Actions)
    ├── index.html         # Landing del formato
    ├── spec.html          # SPEC.md renderizado en HTML
    ├── schemas.html       # Listado de JSON Schemas
    ├── examples.html      # Ejemplos .sdoc descargables
    ├── style.css
    ├── SPEC.md            # Copia cruda para fetch
    ├── schemas/           # 5 JSON Schemas v1
    │   ├── manifest.v1.json
    │   ├── document.v1.json
    │   ├── acl.v1.json
    │   ├── signature.v1.json
    │   └── encryption-meta.v1.json
    └── examples/          # 3 archivos .sdoc reales
        ├── simple.sdoc
        ├── signed.sdoc
        └── encrypted.sdoc
```

## Comandos

```bash
# Generar el sitio en dist/
npm run build -w apps/spec-site

# Previsualizar localmente (http://localhost:4173)
npm run preview -w apps/spec-site

# Limpiar dist/
npm run clean -w apps/spec-site
```

## Cómo activar GitHub Pages

1. Sube el código a GitHub (ya está hecho en `metatech-programmer/sdoc`).
2. Settings → Pages → **Source: GitHub Actions**.
3. Listo. El workflow `.github/workflows/deploy-spec-site.yml` se dispara
   cada vez que se modifica `SPEC.md`, schemas, ejemplos o `apps/spec-site/`.

### Custom domain

1. Crea `apps/spec-site/public/CNAME` con tu dominio:
   ```
   sdoc.app
   ```
2. En tu DNS: `CNAME sdoc.app → metatech-programmer.github.io`.
3. Settings → Pages → Custom domain: `sdoc.app` → Enforce HTTPS.

## Stack

Cero dependencias de runtime. Vanilla HTML + CSS + JS, generado por un
script Node ESM. El SPEC.md se renderiza en cliente con un parser Markdown
mínimo embebido.

## Licencia

MIT (igual que el resto del repo).
