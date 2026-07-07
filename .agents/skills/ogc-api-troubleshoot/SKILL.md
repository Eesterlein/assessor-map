---
name: ogc-api-troubleshoot
description: Diagnose problems with the local OGC API stack — tipg, PostGIS, the seed container, the nginx gateway, or the way map-client / admin-app talks to them. Use this whenever the user reports symptoms like "the map is empty", "my new layer doesn't show up", "tipg returns 404", "I can't see /collections", "CORS error in the browser", "the admin app can't connect", "I loaded data but it's not appearing", "tipg won't start", or anything else where the data is in PostGIS but not making it to the browser. The skill is a structured triage flow: it walks down the stack from "is the container up" through "is the schema discovered" to "is CORS allowing the request", instead of guessing.
---

# Troubleshoot the OGC API Stack

## Why this skill exists

When something in this project is "broken", the cause is almost always at one specific layer of the stack, but the *symptom* shows up at the browser. People (and Claude) tend to start poking at the symptom — restarting the browser, clearing caches, editing the React code — when the actual problem is that tipg never discovered the schema. This skill is a top-down checklist that finds the broken layer fast.

The stack, top to bottom:

```
browser  →  gateway (nginx)  →  map-client / admin-app / tipg  →  PostGIS  →  files in GISData/
```

Work from the bottom up when data is missing; work from the top down when requests are failing.

## Symptoms → likely layer

| Symptom | Start checking at |
|---|---|
| "Map is empty / no features" | tipg `/collections/{id}/items` |
| "Collection isn't listed" | `TIPG_DB_SCHEMAS` + tipg restart |
| "tipg returns 404 for a collection that exists" | tipg restart (catalog cache) |
| "tipg won't start / unhealthy" | postgis health + tipg env |
| "CORS error in browser console" | `TIPG_CORS_ORIGIN` + gateway routing |
| "admin-app can't connect to DB" | `DB_HOST` env on admin-app service |
| "Layer renders in wrong place" | source data CRS — see `load-gis-data` skill |
| "Newly loaded shapefile not showing" | seed container logs + tipg restart |

## The triage flow

### Step 1: Are the containers up?

```bash
docker compose ps
```

Look for: `postgis` (healthy), `seed` (Exited 0 — it's a one-shot), `tipg` (Up), `admin-app` (Up), `map-client` (Up), `gateway` (Up).

If anything is `Exited` with non-zero or `Restarting`, that's your layer. Get its logs:

```bash
docker logs techtraverse-tipg
docker logs techtraverse-postgis
docker logs techtraverse-seed
docker logs techtraverse-admin-app
```

### Step 2: Is PostgreSQL serving?

```bash
docker exec -it techtraverse-postgis psql -U postgres -d gis -c "\dn"
```

You should see the `example` and `your_county` schemas (or whatever schemas the deployment uses). If they're missing, the seed container failed — re-run it:

```bash
docker compose up seed
```

### Step 3: Is the data actually in PostGIS?

```bash
docker exec -it techtraverse-postgis psql -U postgres -d gis \
  -c "\dt example.*; \dt your_county.*"
```

If the table you expect isn't there, the loader didn't run or failed silently. Check `docker logs techtraverse-seed` and re-run with `docker compose up seed --force-recreate`.

If the table is there, check the row count and the SRID:

```sql
SELECT count(*), ST_SRID(geom) FROM your_county.parcels GROUP BY ST_SRID(geom);
```

Expected: a single row with `4326`. If you see multiple SRIDs or anything other than 4326, the load was wrong — see the `load-gis-data` skill for the reprojection step.

### Step 4: Does tipg know about the schema?

```bash
docker compose config | grep TIPG_DB_SCHEMAS
```

The output should include every schema that has tables you want to expose. If your schema isn't listed, edit `docker-compose.yml` to add it, then:

```bash
docker compose up -d tipg
```

### Step 5: Is the collection exposed?

```bash
curl -s http://localhost:8001/collections | jq '.collections[].id'
```

If the collection ID is missing but the table exists in the right schema, tipg's catalog is stale. Restart it:

```bash
docker restart techtraverse-tipg
sleep 3
curl -s http://localhost:8001/collections | jq '.collections[].id'
```

This catches the most common single-line cause of "I added data but it's not showing".

### Step 6: Can you fetch features?

```bash
curl -s 'http://localhost:8001/collections/<schema>.<table>/items?limit=1' | jq '.features[0].properties'
```

If this returns features, the backend is fine and the problem is in the frontend (next steps). If it returns an error, read the body — tipg's errors are usually descriptive (missing column, bad bbox, schema not found).

### Step 7: Is the browser hitting the right URL?

Open the browser devtools network tab and reproduce. Check:

- **Is the URL going to `localhost:8001` directly, or through the gateway at `localhost:8000/ogc`?** Both are valid depending on whether the source in `config.json` points at the direct port or the proxied path. Make sure it matches your actual deployment.
- **Status code.** 404 = collection name wrong, 502 = gateway can't reach tipg, 500 = tipg internal (check tipg logs), 0 / CORS = next step.

### Step 8: CORS

If the browser blocks the request with a CORS error, check `TIPG_CORS_ORIGIN` on the `tipg` service. The repo default is `'*'` which should allow everything; if someone tightened it, they need to add the origin you're loading from.

For requests through the gateway, also check `docker/gateway/nginx.conf` — if the gateway strips or doesn't forward CORS headers, the browser will still block even though tipg sent them.

### Step 9: Admin app DB connection

If the admin app can't connect to PostGIS, the relevant env vars on the `admin-app` service are `DB_HOST=postgis`, `DB_PORT=5432`, `DB_NAME=gis`, `DB_USER=postgres`, `DB_PASSWORD=postgres`. From inside the admin-app container, `postgis` (the service name) must be resolvable — if the user is running the admin-app outside docker compose, they need `DB_HOST=localhost` instead and the postgis port published (which it is, by default).

## Useful one-liners

```bash
# Tail tipg logs while reproducing the issue
docker logs -f techtraverse-tipg

# Watch for slow queries
docker exec -it techtraverse-postgis psql -U postgres -d gis \
  -c "SELECT pid, now() - query_start AS dur, query FROM pg_stat_activity WHERE state = 'active';"

# Validate all collections at once
curl -s http://localhost:8001/collections | jq '.collections[] | {id, itemType, crs}'

# Quick bbox test for a collection
curl -s 'http://localhost:8001/collections/<id>/items?bbox=-180,-90,180,90&limit=1' | jq '.numberMatched'
```

## What to read first

- `docker-compose.yml` — the source of truth for service names, ports, and env vars.
- `docker/gateway/nginx.conf` — how requests are routed when going through `localhost`.
- `docker/seed/seed.sh` and `docker/seed/load-shapefiles.sh` — what the seed container actually does.
- The AGENTS.md note: "Restart tipg with `docker restart techtraverse-tipg` if collections don't appear" — that's the headline fix and worth trying early.
