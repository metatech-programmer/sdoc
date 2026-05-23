FROM node:20-alpine AS builder

WORKDIR /app

# Copia solo los manifiestos primero para aprovechar el caché de capas
COPY package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/sdoc-format/package.json ./packages/sdoc-format/
COPY shared/ts-types/package.json ./shared/ts-types/

RUN npm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/sdoc-format ./packages/sdoc-format
COPY shared/ts-types ./shared/ts-types

RUN npm run build --workspace=@sdoc/types
RUN npm run build --workspace=@sdoc/format
RUN npm run build --workspace=@sdoc/web

FROM nginx:alpine AS runtime

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost/ || exit 1
