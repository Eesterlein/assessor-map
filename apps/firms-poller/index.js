'use strict';

const { Pool } = require('pg');

const FIRMS_MAP_KEY   = process.env.FIRMS_MAP_KEY ?? '';
const FIRMS_AREA      = process.env.FIRMS_AREA ?? '-109,37,-102,41'; // Colorado
const FIRMS_DAYS      = process.env.FIRMS_DAYS ?? '1';
const FIRMS_SOURCE    = process.env.FIRMS_SOURCE ?? 'VIIRS_SNPP_NRT';
const TIPG_REFRESH    = process.env.TIPG_REFRESH_URL ?? 'http://tipg:8000/refresh';
const INTERVAL_MS     = Number(process.env.FIRMS_INTERVAL_MS ?? 1_800_000); // 30 min
const STARTUP_DELAY   = 20_000; // give ingest/tipg time to be ready
const SCHEMA          = 'uploads';
const TABLE           = 'firms_fire_detections';

const pool = new Pool({
  host:     process.env.PGHOST     ?? 'postgis',
  port:     Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'gis',
  user:     process.env.PGUSER     ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'postgres',
});

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.${TABLE} (
      ogc_fid    SERIAL PRIMARY KEY,
      geom       geometry(Point, 4326),
      bright_ti4 REAL,
      scan       REAL,
      track      REAL,
      acq_date   DATE,
      acq_time   TEXT,
      satellite  TEXT,
      instrument TEXT,
      confidence TEXT,
      version    TEXT,
      bright_ti5 REAL,
      frp        REAL,
      daynight   TEXT,
      type       INTEGER
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS ${TABLE}_geom_idx
      ON ${SCHEMA}.${TABLE} USING GIST (geom)
  `);
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (!lines.length) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const latIdx  = headers.indexOf('latitude');
  const lonIdx  = headers.indexOf('longitude');

  if (latIdx === -1 || lonIdx === -1) {
    throw new Error(`Response is not FIRMS CSV — first line: ${lines[0].slice(0, 120)}`);
  }

  const get    = (vals, col) => { const i = headers.indexOf(col); return i >= 0 ? (vals[i] ?? '').trim() : null; };
  const getNum = (vals, col) => { const v = get(vals, col); return v !== null && v !== '' ? parseFloat(v) : null; };
  const getInt = (vals, col) => { const v = get(vals, col); return v !== null && v !== '' ? parseInt(v, 10) : null; };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = line.split(',');
    const lat  = parseFloat(vals[latIdx]);
    const lon  = parseFloat(vals[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;

    rows.push({
      lon, lat,
      bright_ti4: getNum(vals, 'bright_ti4'),
      scan:       getNum(vals, 'scan'),
      track:      getNum(vals, 'track'),
      acq_date:   get(vals, 'acq_date') || null,
      acq_time:   get(vals, 'acq_time') || null,
      satellite:  get(vals, 'satellite') || null,
      instrument: get(vals, 'instrument') || null,
      confidence: get(vals, 'confidence') || null,
      version:    get(vals, 'version') || null,
      bright_ti5: getNum(vals, 'bright_ti5'),
      frp:        getNum(vals, 'frp'),
      daynight:   get(vals, 'daynight') || null,
      type:       getInt(vals, 'type'),
    });
  }
  return rows;
}

async function poll() {
  if (!FIRMS_MAP_KEY) {
    console.warn('[firms-poller] FIRMS_MAP_KEY not set — skipping poll');
    return;
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_MAP_KEY}/${FIRMS_SOURCE}/${FIRMS_AREA}/${FIRMS_DAYS}`;

  let rows;
  try {
    console.log(`[firms-poller] Fetching ${FIRMS_SOURCE} area=${FIRMS_AREA} days=${FIRMS_DAYS}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`[firms-poller] FIRMS API error ${res.status} — keeping existing data`);
      return;
    }
    rows = parseCSV(await res.text());
    console.log(`[firms-poller] Parsed ${rows.length} active fire detection(s)`);
  } catch (err) {
    console.error(`[firms-poller] Fetch/parse error: ${err.message} — keeping existing data`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureTable(client);
    await client.query(`TRUNCATE ${SCHEMA}.${TABLE} RESTART IDENTITY`);

    for (const r of rows) {
      await client.query(
        `INSERT INTO ${SCHEMA}.${TABLE}
           (geom, bright_ti4, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_ti5, frp, daynight, type)
         VALUES
           (ST_SetSRID(ST_MakePoint($1,$2),4326),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [r.lon, r.lat, r.bright_ti4, r.scan, r.track, r.acq_date, r.acq_time,
         r.satellite, r.instrument, r.confidence, r.version, r.bright_ti5, r.frp, r.daynight, r.type],
      );
    }

    await client.query('COMMIT');
    console.log(`[firms-poller] Upserted ${rows.length} row(s) → ${SCHEMA}.${TABLE}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[firms-poller] DB error: ${err.message} — rolled back, existing data preserved`);
    return;
  } finally {
    client.release();
  }

  // Best-effort tipg catalog refresh — non-fatal
  fetch(TIPG_REFRESH, { signal: AbortSignal.timeout(10_000) })
    .then(() => console.log('[firms-poller] tipg catalog refreshed'))
    .catch(err => console.warn(`[firms-poller] tipg refresh skipped: ${err.message}`));
}

console.log(`[firms-poller] Starting — source=${FIRMS_SOURCE} area=${FIRMS_AREA} days=${FIRMS_DAYS} interval=${INTERVAL_MS / 1000}s`);
if (!FIRMS_MAP_KEY) {
  console.warn('[firms-poller] Set FIRMS_MAP_KEY env var to enable polling.');
}

setTimeout(() => {
  poll().then(() => setInterval(poll, INTERVAL_MS));
}, STARTUP_DELAY);
