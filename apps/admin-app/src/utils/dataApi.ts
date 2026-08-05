/**
 * Client for the admin "My Data" endpoints (server/dataRoutes.ts). Uploads use
 * XMLHttpRequest so we can surface progress; the rest use fetch with session
 * cookies.
 */

export interface UploadedDataset {
  id: string;
  table_name: string;
  label: string | null;
  original_filename: string;
  format: string;
  geometry_type: string | null;
  srid: number | null;
  feature_count: number | null;
  bbox: [number, number, number, number] | null;
  crs_assumed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  format?: string;
  label?: string;
  srs?: string;
  geomField?: string;
  layer?: string;
  replace?: boolean;
}

export interface LayerInfo {
  name: string;
  geometryType?: string;
  featureCount?: number;
}

export interface UploadResult extends UploadedDataset {
  collection: string;
  tipgRefreshed: boolean;
}

/** A structured error carrying the HTTP status and the server's JSON body. */
export class DataApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === 'string' ? body.error : `Request failed (${status})`);
    this.name = 'DataApiError';
  }
}

export async function listDatasets(): Promise<UploadedDataset[]> {
  const res = await fetch('/api/data', { credentials: 'include' });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
}

export async function deleteDataset(id: string): Promise<void> {
  const res = await fetch(`/api/data/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
}

// ---------------------------------------------------------------------------
// Row-level CRUD over an uploaded collection (server/rowRoutes.ts).
// Geometry is always GeoJSON in EPSG:4326; the server reprojects to the table
// SRID and coerces single<->multi to match the collection's declared type.
// ---------------------------------------------------------------------------

/** A column as reported by GET /api/data/:id/schema. */
export interface CollectionColumn {
  name: string;
  dataType: string;
  udtName?: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isGeometry: boolean;
}

export interface CollectionSchema {
  table: string;
  primaryKey: string;
  geometry: { column: string; type: string; srid: number } | null;
  columns: CollectionColumn[];
}

/** A single feature row: PK value + attribute bag + GeoJSON geometry. */
export interface FeatureRow {
  id: string | number;
  properties: Record<string, unknown>;
  geometry: GeoJSON.Geometry | null;
}

export interface ListRowsResult {
  rows: FeatureRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListRowsParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filterColumn?: string;
  filter?: string;
}

/** Body shape for create/update. Exported for unit testing. */
export interface RowMutation {
  properties: Record<string, unknown>;
  geometry: GeoJSON.Geometry | null;
}

/** Build the query string for listRows — exported for unit testing. */
export function buildRowsQuery(params: ListRowsParams): string {
  const q = new URLSearchParams();
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.sort) q.set('sort', params.sort);
  if (params.order) q.set('order', params.order);
  if (params.filterColumn) q.set('filterColumn', params.filterColumn);
  if (params.filter) q.set('filter', params.filter);
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
  return res.json() as Promise<T>;
}

export async function getCollectionSchema(id: string): Promise<CollectionSchema> {
  const res = await fetch(`/api/data/${id}/schema`, { credentials: 'include' });
  return jsonOrThrow<CollectionSchema>(res);
}

export async function listRows(id: string, params: ListRowsParams = {}): Promise<ListRowsResult> {
  const res = await fetch(`/api/data/${id}/rows${buildRowsQuery(params)}`, {
    credentials: 'include',
  });
  return jsonOrThrow<ListRowsResult>(res);
}

export async function createRow(id: string, body: RowMutation): Promise<FeatureRow> {
  const res = await fetch(`/api/data/${id}/rows`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<FeatureRow>(res);
}

export async function updateRow(
  id: string,
  rowId: string | number,
  body: RowMutation,
): Promise<FeatureRow> {
  const res = await fetch(`/api/data/${id}/rows/${encodeURIComponent(String(rowId))}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<FeatureRow>(res);
}

export async function deleteRow(id: string, rowId: string | number): Promise<void> {
  const res = await fetch(`/api/data/${id}/rows/${encodeURIComponent(String(rowId))}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
}

// ---------------------------------------------------------------------------
// Virtual Maps — CSV data joined with PostGIS geometries (server/virtualMapsRoutes.ts)
// ---------------------------------------------------------------------------

export interface VirtualMap {
  id: string;
  name: string;
  source_collection: string;
  key_field: string;
  csv_key_column: string;
  csv_columns: string[];
  csv_rows?: Record<string, unknown>[];
  row_count: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVirtualMapBody {
  name: string;
  source_collection: string;
  key_field: string;
  csv_key_column: string;
  csv_columns: string[];
  csv_rows: Record<string, unknown>[];
}

export async function listVirtualMaps(): Promise<VirtualMap[]> {
  const res = await fetch('/api/virtual-maps', { credentials: 'include' });
  return jsonOrThrow<VirtualMap[]>(res);
}

export async function getVirtualMap(id: string): Promise<VirtualMap> {
  const res = await fetch(`/api/virtual-maps/${id}`, { credentials: 'include' });
  return jsonOrThrow<VirtualMap>(res);
}

export async function createVirtualMap(body: CreateVirtualMapBody): Promise<VirtualMap> {
  const res = await fetch('/api/virtual-maps', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<VirtualMap>(res);
}

export async function updateVirtualMap(id: string, body: Partial<CreateVirtualMapBody> & { name?: string }): Promise<VirtualMap> {
  const res = await fetch(`/api/virtual-maps/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<VirtualMap>(res);
}

export async function deleteVirtualMap(id: string): Promise<void> {
  const res = await fetch(`/api/virtual-maps/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
}

/** Build the multipart body for an upload — exported for unit testing. */
export function buildUploadForm(file: File, opts: UploadOptions): FormData {
  const form = new FormData();
  form.append('file', file);
  if (opts.format) form.append('format', opts.format);
  if (opts.label) form.append('label', opts.label);
  if (opts.srs) form.append('srs', opts.srs);
  if (opts.geomField) form.append('geomField', opts.geomField);
  if (opts.layer) form.append('layer', opts.layer);
  if (opts.replace) form.append('replace', 'true');
  return form;
}

/**
 * Upload a file with progress. Resolves with the created dataset, or rejects
 * with a `DataApiError` (status + body) — e.g. 409 conflict, or a 400 carrying
 * `needsLayer` + `layers` that the caller can use to re-prompt.
 */
export function uploadDataset(
  file: File,
  opts: UploadOptions,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/data/upload');
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as unknown as UploadResult);
      } else {
        reject(new DataApiError(xhr.status, body));
      }
    };
    xhr.onerror = () => reject(new DataApiError(0, { error: 'Network error' }));

    xhr.send(buildUploadForm(file, opts));
  });
}
