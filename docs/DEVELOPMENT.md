---
description: Development workflows for TechTraverse Map Apps
---

# Development Workflows

## Prerequisites
- Node.js >= 18
- pnpm >= 10
- Docker

## Initial Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start backend services (PostGIS + tipg + seed + admin-app):
   ```bash
   docker compose up -d
   ```
3. Verify data loaded:
   ```bash
   curl http://localhost:8001/collections
   ```

## Development Commands

### Monorepo
- `pnpm install`: Install dependencies
- `pnpm build`: Build everything
- `pnpm test`: Run tests

### Libraries
- `pnpm storybook`: Run Storybook (http://localhost:6006)
- `pnpm dev:lib`: Watch mode for library
- `pnpm build:lib`: Build library only

### Client App
- `pnpm dev:app`: Run client app (http://localhost:5173)
- `pnpm build:app`: Build client app only
- `pnpm --filter map-client preview`: Preview client app production build

### Admin UI
- `pnpm --filter admin-app dev`: Run admin UI + Express server (http://localhost:5174)
- `pnpm --filter admin-app build`: Build admin UI

## Docker Troubleshooting
- **Restart tipg**: `docker restart techtraverse-tipg` (if collections don't appear)
- **Logs**: `docker logs -f techtraverse-tipg`
