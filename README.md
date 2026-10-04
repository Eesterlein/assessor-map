# Gunnison County Assessor Map

An interactive GIS mapping platform built for Gunnison County assessors. Supports configurable map layers, parcel data visualization, CSV/Excel virtual layer uploads, and wildfire detection — all managed through an admin panel and deployed on a live VPS.

**[Live Map →](http://165.232.147.15)** &nbsp;|&nbsp; **[Admin Panel →](http://165.232.147.15/admin/)**

> **Try the admin demo:** username `demo` / password `gunnison-demo`. Upload data, build maps, change anything you like. The demo resets to a clean copy every night (3 AM Mountain), so nothing you do sticks.

---

> **Independent research project.** This project is built from publicly available Gunnison County, Colorado assessor data downloads and GIS parcel data. It is not an official product of the Gunnison County Assessor's Office or Gunnison County, is not a system of record, and may contain errors or out-of-date information. Always verify against official county records.

## Features

- **Interactive map viewer** — MapLibre GL JS with configurable layers, basemaps, and styles
- **Admin panel** — Configure maps, sources, and layers through a UI without touching code
- **Virtual layers** — Upload a CSV or Excel file and join it to parcel geometries using a shared key (e.g. account number), no geometry required
- **GIS data uploads** — Ingest shapefiles, GeoPackages, GeoJSON, and more directly into PostGIS
- **Wildfire detection** — Live FIRMS/VIIRS fire detection data polled every 30 minutes
- **OGC API** — tipg serves PostGIS data as OGC API Features and vector tiles
- **Multi-map support** — Manage multiple map configurations from one admin panel

## Tech Stack

| Layer | Technology |
|---|---|
| Map rendering | MapLibre GL JS |
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express |
| Database | PostgreSQL + PostGIS |
| OGC API server | tipg |
| File ingestion | GDAL / ogr2ogr |
| Infrastructure | Docker Compose, nginx, DigitalOcean VPS |
| Schema validation | Zod |

## Architecture

```
Browser
  └── nginx gateway (:80)
        ├── /          → map-client (MapLibre SPA)
        ├── /admin/    → admin-app (React + Express)
        ├── /api/      → admin-app Express API
        └── /ogc/      → tipg (OGC API Features + Tiles)
                              └── PostGIS
```

## Running Locally

```bash
# Clone and install
git clone https://github.com/Eesterlein/assessor-map.git
cd assessor-map
pnpm install

# Start all services
docker compose up -d

# App is at http://localhost:8000
# Admin at http://localhost:8000/admin/
```

Requires: Docker, pnpm

## Public Demo

The live server runs as an open demo. `deploy/demo/demo-setup.sh` (run once on the server) sets the demo login, applies production settings (25 MB upload cap, only the nginx gateway published, services restart automatically), saves the current database as the clean snapshot, and schedules `deploy/demo/demo-reset.sh` to restore it nightly.

To change what the demo resets to, set the data up the way you want it, then on the server:

```bash
docker exec techtraverse-postgis pg_dump -U postgres -Fc gis > /opt/assessor-map-demo/golden.dump
```

## Deploying Updates

```bash
# On the server
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

Built by [Elissa Esterlein](https://github.com/Eesterlein)
