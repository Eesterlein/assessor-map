---
name: load-gis-data
description: Load a new GIS dataset (Shapefile, GeoPackage, GeoJSON, FlatGeobuf, KML, File Geodatabase, CSV with WKT, etc.) into the project's PostGIS database so it becomes available through the tipg OGC API at /collections. Use this whenever the user wants to add new geospatial data to the stack — for example "load this shapefile of parcels", "I have a geopackage of trails I want to serve", "add this GeoJSON as a new collection", "ingest the new flood zones layer", or "import county boundaries from the state portal". The skill covers ogr2ogr ingestion, EPSG:4326 reprojection, schema selection, spatial indexing, the tipg schema-discovery env var, and the restart that makes the new collection visible.
---

# Load a GIS Dataset into PostGIS + tipg

## Why this skill exists

The data flow for serving a new layer in this project is:

```
file in GISData/  →  ogr2ogr  →  PostGIS table  →  tipg discovery  →  /collections/{id}
```

Every step has a gotcha. The CRS has to be EPSG:4326 or the map will draw it in the wrong place. The table has to be in a schema tipg knows about (`TIPG_DB_SCHEMAS`), or the collection won't appear. tipg caches its catalog at startup, so a freshly-loaded table isn't visible until you restart the container. And without a GiST index on the geometry column, every bbox query does a full scan. This skill walks through all of that in the right order.

The existing seed pipeline at `docker/seed/` is the reference — `seed.sh` loads Natural Earth data, and `load-shapefiles.sh` loads the deployment's GIS data from `GISData/`. Your job, when adding new data, is usually to extend `load-shapefiles.sh` or write a small companion script that follows the same pattern.

## Steps

1. **Stage the source file.** Drop it into `GISData/` so it's mounted into the seed container at `/GISData` (see the `seed` service in `docker-compose.yml`). For multi-file formats:
   - **Shapefile**: include `.shp`, `.shx`, `.dbf`, and `.prj` together in the same directory. Without `.prj` ogr2ogr will guess the CRS and probably get it wrong.
   - **GeoPackage**: a single `.gpkg` file. Multiple layers per file are fine — ogr2ogr addresses them by layer name.
   - **GeoJSON / FlatGeobuf**: a single file. Always EPSG:4326 by spec for GeoJSON, but FlatGeobuf can be in any CRS, so don't assume.
   - **File Geodatabase**: a `.gdb` directory.

2. **Pick a schema.** Decide whether the new data belongs in an existing schema (e.g. `example`, `your_county`) or a new one. Use a new schema for a logically separate dataset (a new client, a new region) — schemas are the unit of access control and tipg discovery. Create with `CREATE SCHEMA IF NOT EXISTS <name>;` in `seed.sh` or your loader script.

3. **Reproject to EPSG:4326.** This is the project-wide convention because MapLibre and the OGC API Features clients all expect WGS84. Pass `-t_srs EPSG:4326` to ogr2ogr. If the source has no CRS metadata, also pass `-s_srs EPSG:<source_epsg>` so the reprojection has a starting point.

4. **Run ogr2ogr** with the project's standard flags. See `references/ogr2ogr-recipes.md` for copy-pasteable commands per format. The standard flags are:
   - `-f PostgreSQL` — output driver
   - `-nln <table_name>` — destination table name (lowercase, snake_case)
   - `-nlt PROMOTE_TO_MULTI` — for line/polygon data, so single+multi geometries can coexist
   - `-lco GEOMETRY_NAME=geom` — column name `geom` (project convention)
   - `-lco FID=gid` — primary key column `gid`
   - `-lco SCHEMA=<schema>` — destination schema
   - `-t_srs EPSG:4326` — reproject
   - `-overwrite` if you're reloading; otherwise omit so accidental re-runs fail loudly

5. **Create a GiST index on the geometry column.** Spatial queries fall off a cliff without this. Pattern:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_<table>_geom ON <schema>.<table> USING GIST (geom);
   ```

6. **Tell tipg about the schema.** tipg only discovers tables in schemas listed in the `TIPG_DB_SCHEMAS` env var on the `tipg` service in `docker-compose.yml`. If you used an existing schema (e.g. `example`, `your_county`) you can skip this. If you added a new schema, append it:
   ```yaml
   TIPG_DB_SCHEMAS: '["example", "your_county", "your_new_schema"]'
   ```

7. **Restart tipg so it re-scans.** tipg builds its catalog at startup, so newly added tables don't appear until you bounce it:
   ```bash
   docker restart techtraverse-tipg
   ```

8. **Verify the new collection is live.**
   ```bash
   curl http://localhost:8001/collections | jq '.collections[].id'
   curl 'http://localhost:8001/collections/<schema>.<table>/items?limit=1' | jq
   ```
   The collection ID format tipg uses is `<schema>.<table>`. If it's missing, see the `ogc-api-troubleshoot` skill.

9. **Reference the collection from `config.json`.** Add it to a source's `collectionId` and to a layer that points at that source. The layer will then show up in the map client.

## What to read first

- `docker/seed/seed.sh` — the canonical example of loading shapefiles with the project's flag conventions.
- `docker/seed/load-shapefiles.sh` — bulk loader that scans `GISData/` for files. Often the right place to add a new entry rather than writing a one-off script.
- `docker-compose.yml` — the `tipg` and `seed` service definitions, especially `TIPG_DB_SCHEMAS`.
- `references/ogr2ogr-recipes.md` in this skill folder — recipes for each format.

## Common mistakes

- **Forgetting `-t_srs EPSG:4326`.** The data loads but renders in the wrong place (or, for non-projected data labeled as projected, doesn't render at all).
- **Loading into a schema not in `TIPG_DB_SCHEMAS`.** The table exists in PostGIS, queries work over psql, but `/collections` doesn't list it. Always check the env var.
- **Forgetting to restart tipg.** Same symptom — table exists, collection missing. `docker restart techtraverse-tipg` is a cheap fix but easy to skip.
- **Skipping the GiST index.** Things "work" in dev with small tables, then production queries time out at scale.
- **Mixed-case or hyphenated table names.** PostgreSQL will let you create them but you'll need to quote them everywhere afterward, including in tipg URLs. Use lowercase snake_case.
- **Missing `.prj` for shapefiles.** ogr2ogr guesses, often wrong. Always include all sidecar files.
