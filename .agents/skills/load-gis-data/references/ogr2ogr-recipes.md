# ogr2ogr recipes for the project

All examples assume you're running inside the `seed` container (or have `ogr2ogr` and a libpq env set up locally), and that the destination is the project's PostGIS at `host=postgis port=5432 dbname=gis user=postgres`.

The connection string used throughout:

```
PG="PG:host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD"
```

## Shapefile

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/parcels.shp \
  -nln parcels \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county
```

If the source `.prj` is missing, add `-s_srs EPSG:<source_epsg>` (you have to know the source CRS).

## GeoPackage (single layer)

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/trails.gpkg \
  -nln trails \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county
```

## GeoPackage (specific layer from a multi-layer file)

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/multi.gpkg \
  -nln waterways \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county \
  waterways  # <-- source layer name within the gpkg
```

List layers in a gpkg first with `ogrinfo /GISData/multi.gpkg`.

## GeoJSON

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/flood_zones.geojson \
  -nln flood_zones \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county
```

GeoJSON is EPSG:4326 by spec, so the reprojection is a no-op but harmless. Keep it for consistency.

## FlatGeobuf

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/buildings.fgb \
  -nln buildings \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county
```

## File Geodatabase

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/county.gdb \
  -nln county_boundary \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county \
  county_boundary  # source layer name
```

## CSV with WKT geometry

```bash
ogr2ogr -f PostgreSQL "$PG" \
  /GISData/points.csv \
  -oo GEOM_POSSIBLE_NAMES=geometry \
  -oo KEEP_GEOM_COLUMNS=NO \
  -a_srs EPSG:4326 \
  -nln points \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid \
  -lco SCHEMA=your_county
```

For lat/lon columns instead of WKT, swap to `-oo X_POSSIBLE_NAMES=lon -oo Y_POSSIBLE_NAMES=lat`.

## Inspecting before loading

```bash
# What's in the file?
ogrinfo -so /GISData/parcels.shp parcels

# What CRS does it claim?
ogrinfo -so /GISData/parcels.shp parcels | grep -i 'srs\|epsg\|coord'

# How many features?
ogrinfo -so /GISData/parcels.shp parcels | grep 'Feature Count'
```

## After loading: index and verify

```sql
-- Run via psql
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON your_county.parcels USING GIST (geom);
ANALYZE your_county.parcels;

-- Sanity check
SELECT count(*), ST_SRID(geom) FROM your_county.parcels GROUP BY ST_SRID(geom);
-- Expect a single row with SRID = 4326.
```

Then bounce tipg and curl `/collections`:

```bash
docker restart techtraverse-tipg
sleep 3
curl -s http://localhost:8001/collections | jq '.collections[].id' | grep parcels
```
