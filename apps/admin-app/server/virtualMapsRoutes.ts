/**
 * Virtual Maps API — CSV data joined with PostGIS geometries on the fly.
 *
 * A "virtual map" is created when a user uploads a CSV without geometries.
 * It stores the CSV rows in JSONB and references an existing PostGIS collection
 * (e.g. `uploads.parcels`). The GeoJSON endpoint joins CSV attributes onto
 * matching PostGIS features at query time, returning a FeatureCollection that
 * MapLibre can consume directly.
 */
import express from 'express';
import type { Pool } from 'pg';
import { isValidIdentifier, isValidColumnName } from './sanitizeTableName.js';

export interface VirtualMapsRouteDeps {
  app: express.Express;
  pool: Pool;
  requireAuth: express.RequestHandler;
}

interface VirtualMapRow {
  id: string;
  name: string;
  source_collection: string;
  key_field: string;
  csv_key_column: string;
  csv_columns: string[];
  csv_rows: Record<string, unknown>[];
  row_count: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function parseCollection(collection: string): { schema: string; table: string } | null {
  const parts = collection.split('.');
  if (parts.length !== 2) return null;
  const [schema, table] = parts;
  // Use isValidColumnName (not isValidIdentifier) so known schema names like
  // "uploads" and "map_admin" are accepted — they're double-quoted in SQL.
  if (!isValidColumnName(schema) || !isValidColumnName(table)) return null;
  return { schema, table };
}

function handleError(res: express.Response, err: unknown): void {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

export function registerVirtualMapsRoutes({ app, pool, requireAuth }: VirtualMapsRouteDeps): void {

  // GET /api/virtual-maps — list all virtual maps
  app.get('/api/virtual-maps', async (_req, res) => {
    try {
      const result = await pool.query<VirtualMapRow>(
        `SELECT id, name, source_collection, key_field, csv_key_column,
                csv_columns, row_count, created_by, created_at, updated_at
           FROM map_admin.virtual_maps
          ORDER BY created_at DESC`,
      );
      res.json(result.rows);
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST /api/virtual-maps — create (protected)
  app.post('/api/virtual-maps', requireAuth, async (req, res) => {
    const body = req.body as {
      name?: string;
      source_collection?: string;
      key_field?: string;
      csv_key_column?: string;
      csv_columns?: string[];
      csv_rows?: Record<string, unknown>[];
    };

    if (!body.name || !body.source_collection || !body.key_field || !body.csv_key_column) {
      res.status(400).json({ error: 'name, source_collection, key_field, and csv_key_column are required' });
      return;
    }

    const parsed = parseCollection(body.source_collection);
    if (!parsed) {
      res.status(400).json({ error: 'source_collection must be schema.table with safe identifiers' });
      return;
    }

    if (!isValidColumnName(body.key_field)) {
      res.status(400).json({ error: 'key_field must be a safe identifier' });
      return;
    }

    const csvRows = body.csv_rows ?? [];
    const csvColumns = body.csv_columns ?? [];

    try {
      const result = await pool.query<VirtualMapRow>(
        `INSERT INTO map_admin.virtual_maps
           (name, source_collection, key_field, csv_key_column, csv_columns, csv_rows, row_count, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          body.name,
          body.source_collection,
          body.key_field,
          body.csv_key_column,
          JSON.stringify(csvColumns),
          JSON.stringify(csvRows),
          csvRows.length,
          (req.session as { username?: string }).username ?? null,
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET /api/virtual-maps/:id — single virtual map
  app.get('/api/virtual-maps/:id', async (req, res) => {
    try {
      const result = await pool.query<VirtualMapRow>(
        'SELECT * FROM map_admin.virtual_maps WHERE id = $1',
        [req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Virtual map not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // PUT /api/virtual-maps/:id — update (protected)
  app.put('/api/virtual-maps/:id', requireAuth, async (req, res) => {
    const body = req.body as {
      name?: string;
      source_collection?: string;
      key_field?: string;
      csv_key_column?: string;
      csv_columns?: string[];
      csv_rows?: Record<string, unknown>[];
    };

    try {
      const found = await pool.query<VirtualMapRow>(
        'SELECT * FROM map_admin.virtual_maps WHERE id = $1',
        [req.params.id],
      );
      if (found.rows.length === 0) {
        res.status(404).json({ error: 'Virtual map not found' });
        return;
      }

      const current = found.rows[0];
      const name = body.name ?? current.name;
      const sourceCollection = body.source_collection ?? current.source_collection;
      const keyField = body.key_field ?? current.key_field;
      const csvKeyColumn = body.csv_key_column ?? current.csv_key_column;
      const csvRows = body.csv_rows ?? current.csv_rows;
      const csvColumns = body.csv_columns ?? current.csv_columns;

      if (body.source_collection && !parseCollection(body.source_collection)) {
        res.status(400).json({ error: 'source_collection must be schema.table with safe identifiers' });
        return;
      }
      if (body.key_field && !isValidIdentifier(body.key_field)) {
        res.status(400).json({ error: 'key_field must be a safe identifier' });
        return;
      }

      const result = await pool.query<VirtualMapRow>(
        `UPDATE map_admin.virtual_maps
            SET name = $2, source_collection = $3, key_field = $4,
                csv_key_column = $5, csv_columns = $6, csv_rows = $7,
                row_count = $8, updated_at = now()
          WHERE id = $1
         RETURNING *`,
        [
          req.params.id, name, sourceCollection, keyField, csvKeyColumn,
          JSON.stringify(csvColumns), JSON.stringify(csvRows), csvRows.length,
        ],
      );
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // DELETE /api/virtual-maps/:id (protected)
  app.delete('/api/virtual-maps/:id', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM map_admin.virtual_maps WHERE id = $1 RETURNING id',
        [req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Virtual map not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET /api/virtual-maps/:id/geojson — join CSV attributes with PostGIS geometries
  app.get('/api/virtual-maps/:id/geojson', async (req, res) => {
    try {
      const found = await pool.query<VirtualMapRow>(
        'SELECT * FROM map_admin.virtual_maps WHERE id = $1',
        [req.params.id],
      );
      if (found.rows.length === 0) {
        res.status(404).json({ error: 'Virtual map not found' });
        return;
      }

      const vm = found.rows[0];
      const parsed = parseCollection(vm.source_collection);
      if (!parsed) {
        res.status(400).json({ error: 'Stored source_collection is invalid' });
        return;
      }

      // Verify key_field is a real column to prevent SQL injection before interpolation.
      const colCheck = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
        [parsed.schema, parsed.table, vm.key_field],
      );
      if (colCheck.rows.length === 0) {
        res.status(400).json({ error: `Column "${vm.key_field}" does not exist in ${vm.source_collection}` });
        return;
      }

      // Extract join key values from CSV rows.
      const csvRows = vm.csv_rows as Record<string, unknown>[];
      const keyValues = csvRows
        .map(row => String(row[vm.csv_key_column] ?? ''))
        .filter(Boolean);

      if (keyValues.length === 0) {
        res.json({ type: 'FeatureCollection', features: [] });
        return;
      }

      // Build a lookup map from key → csv row for fast joining.
      const csvLookup = new Map<string, Record<string, unknown>>();
      for (const row of csvRows) {
        const key = String(row[vm.csv_key_column] ?? '');
        if (key) csvLookup.set(key, row);
      }

      // Query PostGIS: fetch geometry + join key for matching rows.
      // key_field has been validated above so interpolation is safe.
      const gisResult = await pool.query<{ geometry: object; join_key: string }>(
        `SELECT ST_AsGeoJSON(ST_Transform(geom, 4326))::json AS geometry,
                CAST("${vm.key_field}" AS TEXT) AS join_key
           FROM "${parsed.schema}"."${parsed.table}"
          WHERE CAST("${vm.key_field}" AS TEXT) = ANY($1::TEXT[])`,
        [keyValues],
      );

      const features = gisResult.rows
        .map(row => {
          const csvAttrs = csvLookup.get(row.join_key) ?? {};
          return {
            type: 'Feature' as const,
            geometry: row.geometry,
            properties: {
              ...csvAttrs,
              _virtual_key: row.join_key,
            },
          };
        })
        .filter(f => f.geometry != null);

      res.json({ type: 'FeatureCollection', features });
    } catch (err) {
      handleError(res, err);
    }
  });
}
