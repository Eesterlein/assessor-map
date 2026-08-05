import { Pool } from 'pg';

export function createPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'gis',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    options: '-c search_path=map_admin,public',
  });
}

export const pool = createPool();

export async function initDb(): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS map_admin`);

  // Core map configs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.map_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT false,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Drop legacy environment-scoped indexes
  await pool.query(`DROP INDEX IF EXISTS map_admin.map_configs_is_published_idx`);
  await pool.query(`DROP INDEX IF EXISTS map_admin.map_configs_published_per_env_idx`);
  await pool.query(`DROP INDEX IF EXISTS map_admin.map_configs_published_name_env_idx`);
  await pool.query(`DROP INDEX IF EXISTS map_admin.map_configs_default_per_env_idx`);

  // Unique published names (global, no environment scoping)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS map_configs_published_name_idx
      ON map_admin.map_configs (name) WHERE is_published = true
  `);

  // Enforce slug format for config names
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE map_admin.map_configs ADD CONSTRAINT map_configs_name_slug_check
        CHECK (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  // Version history table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.config_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_id UUID NOT NULL REFERENCES map_admin.map_configs(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS config_versions_config_id_idx
      ON map_admin.config_versions (config_id, version_number DESC)
  `);

  // Prevent duplicate version numbers for the same config
  await pool.query(`
    ALTER TABLE map_admin.config_versions DROP CONSTRAINT IF EXISTS config_versions_config_id_version_number_key
  `);
  await pool.query(`
    ALTER TABLE map_admin.config_versions ADD CONSTRAINT config_versions_config_id_version_number_key UNIQUE (config_id, version_number)
  `);

  // Add is_default column (at most one default globally)
  await pool.query(`
    ALTER TABLE map_admin.map_configs ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS map_configs_default_idx
      ON map_admin.map_configs ((true)) WHERE is_default = true
  `);

  // Reusable OGC API sources catalog
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.ogc_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      label TEXT,
      tile_matrix_set_id TEXT DEFAULT 'WebMercatorQuad',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Enforce slug format for source_id
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE map_admin.ogc_sources ADD CONSTRAINT ogc_sources_source_id_slug_check
        CHECK (source_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  // Source type discriminator (features, imagery, or basemap)
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'features'
  `);

  // Constrain source_type to valid values. Re-applied unconditionally so the
  // value list stays in sync when new source types are added (e.g. 'wmts').
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources DROP CONSTRAINT IF EXISTS ogc_sources_source_type_check
  `);
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD CONSTRAINT ogc_sources_source_type_check
      CHECK (source_type IN ('features', 'imagery', 'basemap', 'wmts'))
  `);

  // Authentication config (JSONB: { type, name, value })
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD COLUMN IF NOT EXISTS auth JSONB
  `);

  // Cached metadata from OGC API inspection
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD COLUMN IF NOT EXISTS metadata JSONB
  `);
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD COLUMN IF NOT EXISTS metadata_updated_at TIMESTAMPTZ
  `);

  // Proxy flag: route requests through the server to protect API keys and bypass CORS
  await pool.query(`
    ALTER TABLE map_admin.ogc_sources ADD COLUMN IF NOT EXISTS proxy BOOLEAN NOT NULL DEFAULT false
  `);

  // Site-wide branding / customization (single-row table)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.site_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      header_title TEXT NOT NULL DEFAULT 'Map Config Admin',
      header_color TEXT NOT NULL DEFAULT '#1e293b',
      browser_title TEXT NOT NULL DEFAULT 'Map Config Admin',
      favicon_data_url TEXT,
      logo_data_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    INSERT INTO map_admin.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING
  `);
  await pool.query(`
    ALTER TABLE map_admin.site_settings ADD COLUMN IF NOT EXISTS logo_height INTEGER NOT NULL DEFAULT 32
  `);

  // Seed default basemap sources
  await pool.query(`
    INSERT INTO map_admin.ogc_sources (source_id, url, label, source_type)
    VALUES
      ('carto-positron', 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', 'Positron (Light)', 'basemap'),
      ('carto-dark-matter', 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', 'Dark Matter (Dark)', 'basemap'),
      ('carto-voyager', 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 'Voyager (Streets)', 'basemap')
    ON CONFLICT (source_id) DO NOTHING
  `);

  // Schema that holds user-uploaded GIS datasets ("My Data"). Pre-created so
  // tipg (which discovers schemas at boot via TIPG_DB_SCHEMAS) sees it even when
  // empty. The ingest sidecar writes tables here; tipg serves them as
  // `uploads.<table>` collections under the auto-detected `tipg-local` source.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS uploads`);

  // Tracking metadata for uploaded datasets. The PostGIS table in `uploads` is
  // the source of truth for the data itself; this row records provenance and the
  // detected geometry stats so "My Data" lists fast without round-tripping tipg.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.uploaded_datasets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name TEXT NOT NULL UNIQUE,
      label TEXT,
      original_filename TEXT NOT NULL,
      format TEXT NOT NULL,
      geometry_type TEXT,
      srid INTEGER DEFAULT 4326,
      feature_count INTEGER,
      bbox JSONB,
      crs_assumed BOOLEAN NOT NULL DEFAULT false,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Enforce safe snake_case identifiers at the DB layer too (defense in depth).
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE map_admin.uploaded_datasets ADD CONSTRAINT uploaded_datasets_table_name_slug_check
        CHECK (table_name ~ '^[a-z_][a-z0-9_]*$');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  // Virtual layers: CSV data joined with PostGIS geometries at query time.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_admin.virtual_maps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      source_collection TEXT NOT NULL,
      key_field TEXT NOT NULL,
      csv_key_column TEXT NOT NULL,
      csv_columns JSONB NOT NULL DEFAULT '[]',
      csv_rows JSONB NOT NULL DEFAULT '[]',
      row_count INTEGER,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
