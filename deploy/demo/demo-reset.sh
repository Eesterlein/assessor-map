#!/bin/sh
# Restores the public demo database from the clean snapshot so anything
# visitors add, edit, or delete is undone. Runs nightly from cron (see
# deploy/demo/demo-setup.sh). Takes about a minute; the map is briefly offline.
set -u
cd "$(dirname "$0")/../.."
SNAPSHOT="${DEMO_SNAPSHOT:-/opt/assessor-map-demo/golden.dump}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [ ! -s "$SNAPSHOT" ]; then
  echo "$(date) demo reset skipped: no snapshot at $SNAPSHOT"
  exit 1
fi

echo "$(date) demo reset starting"
$COMPOSE stop admin-app ingest tipg firms-poller
docker exec techtraverse-postgis dropdb -U postgres --if-exists --force gis
docker exec techtraverse-postgis createdb -U postgres gis
# pg_restore exits non-zero on harmless warnings (e.g. extension comments),
# so report rather than abort; services must come back up either way.
docker exec -i techtraverse-postgis pg_restore -U postgres -d gis --no-owner < "$SNAPSHOT" \
  || echo "pg_restore reported warnings (usually harmless)"
$COMPOSE start tipg ingest admin-app firms-poller
echo "$(date) demo reset done"
