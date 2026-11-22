# Stage 1: Builder — compile the TypeScript sidecar to JS.
FROM node:26-alpine AS builder
RUN corepack enable
WORKDIR /app

# Workspace manifests for dependency resolution.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
# Patched deps referenced by root package.json (pnpm patchedDependencies) must
# be present before install, or `pnpm install --frozen-lockfile` errors.
COPY patches/ ./patches/
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-app/package.json ./apps/admin-app/
COPY apps/map-client/package.json ./apps/map-client/
COPY apps/ingest-service/package.json ./apps/ingest-service/

RUN pnpm install --frozen-lockfile --filter ingest-service...

COPY apps/ingest-service/ ./apps/ingest-service/
RUN pnpm --filter ingest-service build

# Stage 2: Runtime — GDAL base (ogr2ogr/ogrinfo on PATH) + Node.
# The GDAL Alpine image's `npm` package does NOT bundle corepack (that ships only
# with the official Node images), so install pnpm directly via npm.
FROM ghcr.io/osgeo/gdal:alpine-normal-latest AS runtime
# Bump APK_REVISION (YYYY-MM-DD) to force a fresh apk index past the buildx layer
# cache when a base-image package CVE needs the upgrade applied. The GDAL base is
# not rebuilt as often as we scan, so apply outstanding Alpine fixes here (mirrors
# map-client/admin-app Dockerfiles).
ARG APK_REVISION=2026-06-07
RUN echo "apk revision: $APK_REVISION" \
  && apk update \
  && apk upgrade --no-cache \
  && apk add --no-cache nodejs npm \
  && npm install -g pnpm@10.29.1 \
  && rm -rf /var/cache/apk/*
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY patches/ ./patches/
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-app/package.json ./apps/admin-app/
COPY apps/map-client/package.json ./apps/map-client/
COPY apps/ingest-service/package.json ./apps/ingest-service/

# pnpm/npm are only needed to materialize the prod dependency tree. They are NOT
# used at runtime (CMD is plain `node`), and the globally-installed pnpm CLI
# vendors its own copies of tar/minimatch/picomatch which Trivy flags as fixable
# HIGH CVEs. Remove pnpm and npm once the install completes so they don't ship in
# the final image.
RUN pnpm install --frozen-lockfile --prod --filter ingest-service... \
  && npm uninstall -g pnpm \
  && apk del npm \
  && rm -rf /root/.npm /root/.local/share/pnpm /usr/local/lib/node_modules/npm

COPY --from=builder /app/apps/ingest-service/dist/ ./apps/ingest-service/dist/

WORKDIR /app/apps/ingest-service
EXPOSE 8081
# Run unprivileged; uploads are staged in /tmp
RUN adduser -D -H -u 10001 app
USER app
CMD ["node", "dist/index.js"]
