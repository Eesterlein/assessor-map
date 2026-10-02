#!/bin/sh
# One-time setup for the public demo. Run on the server from the repo folder:
#   sh deploy/demo/demo-setup.sh
# It sets the public demo login, applies the production compose settings
# (upload caps, internal-only ports), snapshots the current data as the clean
# demo state, and schedules a nightly reset.
set -eu
cd "$(dirname "$0")/../.."
REPO="$(pwd)"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
SNAPDIR=/opt/assessor-map-demo

# 1. Compose must understand `!reset` in docker-compose.prod.yml.
ver=$(docker compose version --short | sed 's/^v//')
if [ "$(printf '%s\n2.24.4\n' "$ver" | sort -V | head -1)" != "2.24.4" ]; then
  echo "Docker Compose $ver is too old (need 2.24.4+). Update it, then rerun."
  exit 1
fi

# 2. Demo login (public on purpose; resets nightly).
printf 'Demo username [demo]: '; read -r DEMO_USER; DEMO_USER=${DEMO_USER:-demo}
printf 'Demo password [gunnison-demo]: '; read -r DEMO_PASS; DEMO_PASS=${DEMO_PASS:-gunnison-demo}
HASH=$(docker run --rm httpd:alpine htpasswd -nbBC 10 "" "$DEMO_PASS" | tr -d ':\n' | sed 's/^\$2y/$2a/')
touch .env
cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"
grep -vE '^(ADMIN_USERNAME|ADMIN_PASSWORD_HASH)=' .env > .env.tmp || true
printf "ADMIN_USERNAME=%s\nADMIN_PASSWORD_HASH='%s'\n" "$DEMO_USER" "$HASH" >> .env.tmp
mv .env.tmp .env
echo "Login set to $DEMO_USER (old .env backed up)."

# 3. Rebuild with the new settings.
$COMPOSE up -d --build

# 4. Snapshot the current data as the clean demo state.
mkdir -p "$SNAPDIR"
echo "Waiting for the database..."
sleep 10
docker exec techtraverse-postgis pg_dump -U postgres -Fc gis > "$SNAPDIR/golden.dump"
cp "$SNAPDIR/golden.dump" "$SNAPDIR/golden-$(date +%Y%m%d).dump"
echo "Snapshot saved: $(du -h "$SNAPDIR/golden.dump" | cut -f1)"

# 5. Nightly reset at 09:00 UTC (3 AM Mountain).
chmod +x deploy/demo/demo-reset.sh
LINE="0 9 * * * $REPO/deploy/demo/demo-reset.sh >> /var/log/assessor-demo-reset.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'demo-reset.sh' ; echo "$LINE" ) | crontab -
echo "Nightly reset scheduled."

# 6. Confirm only the gateway (port 80) is published.
echo "Published container ports (expect only 80):"
docker ps --format '{{.Names}}  {{.Ports}}'
