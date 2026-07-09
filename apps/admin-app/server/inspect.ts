/**
 * Source inspection — fetches metadata from OGC API, TileJSON, or XYZ tile endpoints
 * and returns a structured result with graceful error handling.
 */

import {
  detectTileSourceType,
  fetchArcgisServiceInfo,
  type ArcgisTileMetadata,
} from '@techtraverse/map-ui-lib/hooks';

const REQUEST_TIMEOUT_MS = 10_000;
const COLLECTION_BATCH_SIZE = 5;

// --- Types ---

export interface QueryableMeta {
  name: string;
  type?: string;
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface CollectionMeta {
  id: string;
  title?: string;
  description?: string;
  itemCount: number | null;
  itemCountError?: string;
  extent?: {
    spatial?: { bbox?: number[][] };
    temporal?: { interval?: Array<[string | null, string | null]> };
  };
  itemType?: string;
  queryables: QueryableMeta[] | null;
  queryablesError?: string;
}

export interface TileJsonMeta {
  tilejson: string;
  tiles: string[];
  name?: string;
  description?: string;
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  center?: [number, number, number];
}

export interface InspectionResult {
  landing: { title?: string; description?: string } | null;
  conformance: string[] | null;
  conformanceError?: string;
  collections: CollectionMeta[];
  inspectedAt: string;
  errors: string[];
  tileJson?: TileJsonMeta;
  arcgis?: ArcgisTileMetadata;
  refreshUrl?: string;
}

// --- Helpers ---

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return 'Request timed out';
    }
    const cause = (err as { cause?: Error }).cause;
    const detail = cause instanceof Error ? `: ${cause.message}` : '';
    return err.message + detail;
  }
  return String(err);
}

// --- Inspection steps ---

async function fetchLanding(baseUrl: string): Promise<InspectionResult['landing']> {
  try {
    const data = await fetchJson(`${baseUrl}?f=json`) as Record<string, unknown>;
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchConformance(baseUrl: string): Promise<{ conformance: string[] | null; error?: string }> {
  try {
    const data = await fetchJson(`${baseUrl}/conformance?f=json`) as Record<string, unknown>;
    const conformsTo = data.conformsTo;
    if (Array.isArray(conformsTo)) {
      return { conformance: conformsTo as string[] };
    }
    return { conformance: null, error: 'Unexpected conformance response format' };
  } catch (err) {
    return { conformance: null, error: errorMessage(err) };
  }
}

interface RawCollection {
  id: string;
  title?: string;
  description?: string;
  extent?: CollectionMeta['extent'];
  itemType?: string;
}

async function fetchCollectionsList(baseUrl: string): Promise<{ collections: RawCollection[]; error?: string }> {
  try {
    const data = await fetchJson(`${baseUrl}/collections?f=json`) as Record<string, unknown>;
    const collections = data.collections;
    if (!Array.isArray(collections)) {
      return { collections: [], error: 'Unexpected collections response format' };
    }
    return {
      collections: collections.map((c: Record<string, unknown>) => ({
        id: String(c.id ?? ''),
        title: typeof c.title === 'string' ? c.title : undefined,
        description: typeof c.description === 'string' ? c.description : undefined,
        extent: c.extent as CollectionMeta['extent'],
        itemType: typeof c.itemType === 'string' ? c.itemType : undefined,
      })),
    };
  } catch (err) {
    return { collections: [], error: errorMessage(err) };
  }
}

async function fetchItemCount(baseUrl: string, collectionId: string): Promise<{ count: number | null; error?: string }> {
  try {
    const url = `${baseUrl}/collections/${encodeURIComponent(collectionId)}/items?limit=0`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'Accept': 'application/geo+json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json() as Record<string, unknown>;
    const count = data.numberMatched ?? data.numberReturned;
    if (typeof count === 'number') {
      return { count };
    }
    return { count: null };
  } catch (err) {
    return { count: null, error: errorMessage(err) };
  }
}

async function fetchQueryables(baseUrl: string, collectionId: string): Promise<{ queryables: QueryableMeta[] | null; error?: string }> {
  try {
    const data = await fetchJson(`${baseUrl}/collections/${encodeURIComponent(collectionId)}/queryables`) as Record<string, unknown>;
    const properties = data.properties;
    if (!properties || typeof properties !== 'object') {
      return { queryables: null };
    }
    const result: QueryableMeta[] = [];
    for (const [name, prop] of Object.entries(properties as Record<string, Record<string, unknown>>)) {
      result.push({
        name,
        type: typeof prop.type === 'string' ? prop.type : undefined,
        title: typeof prop.title === 'string' ? prop.title : undefined,
        description: typeof prop.description === 'string' ? prop.description : undefined,
        format: typeof prop.format === 'string' ? prop.format : undefined,
        enum: Array.isArray(prop.enum) ? prop.enum as string[] : undefined,
        minimum: typeof prop.minimum === 'number' ? prop.minimum : undefined,
        maximum: typeof prop.maximum === 'number' ? prop.maximum : undefined,
      });
    }
    return { queryables: result };
  } catch (err) {
    return { queryables: null, error: errorMessage(err) };
  }
}

async function discoverRefreshUrl(baseUrl: string): Promise<string | undefined> {
  // tipg serves its OpenAPI spec at /api (FastAPI's default /openapi.json route is disabled).
  // Try /api first, then fall back to /openapi.json for stock FastAPI deployments.
  for (const specPath of ['/api?f=json', '/openapi.json']) {
    try {
      const spec = await fetchJson(`${baseUrl}${specPath}`) as { paths?: Record<string, unknown> };
      const paths = spec.paths;
      if (paths && typeof paths === 'object' && ('/refresh' in paths || '/refresh/' in paths)) {
        return `${baseUrl}/refresh`;
      }
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

// --- Main inspection function ---

export async function inspectOgcSource(url: string): Promise<InspectionResult> {
  const baseUrl = stripTrailingSlash(normalizeUrl(url));
  const errors: string[] = [];

  // Fetch landing + conformance + collections + refresh-url discovery in parallel
  const [landing, conformanceResult, collectionsResult, refreshUrl] = await Promise.all([
    fetchLanding(baseUrl),
    fetchConformance(baseUrl),
    fetchCollectionsList(baseUrl),
    discoverRefreshUrl(baseUrl),
  ]);

  if (collectionsResult.error) {
    errors.push(`Collections: ${collectionsResult.error}`);
  }

  // Fetch per-collection details in batches
  const collections: CollectionMeta[] = [];
  const rawCollections = collectionsResult.collections;

  for (let i = 0; i < rawCollections.length; i += COLLECTION_BATCH_SIZE) {
    const batch = rawCollections.slice(i, i + COLLECTION_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (col) => {
        const [countResult, queryablesResult] = await Promise.all([
          fetchItemCount(baseUrl, col.id),
          fetchQueryables(baseUrl, col.id),
        ]);
        const meta: CollectionMeta = {
          id: col.id,
          title: col.title,
          description: col.description,
          itemCount: countResult.count,
          extent: col.extent,
          itemType: col.itemType,
          queryables: queryablesResult.queryables,
        };
        if (countResult.error) meta.itemCountError = countResult.error;
        if (queryablesResult.error) meta.queryablesError = queryablesResult.error;
        return meta;
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        collections.push(result.value);
      } else {
        errors.push(`Collection batch error: ${errorMessage(result.reason)}`);
      }
    }
  }

  return {
    landing,
    conformance: conformanceResult.conformance,
    conformanceError: conformanceResult.error,
    collections,
    inspectedAt: new Date().toISOString(),
    errors,
    refreshUrl,
  };
}

// --- TileJSON inspection ---

async function inspectTileJsonSource(url: string): Promise<InspectionResult> {
  const normalizedUrl = normalizeUrl(url);
  try {
    const data = await fetchJson(normalizedUrl) as Record<string, unknown>;
    const tiles = data.tiles;
    if (!Array.isArray(tiles) || tiles.length === 0) {
      return {
        landing: null,
        conformance: null,
        collections: [],
        inspectedAt: new Date().toISOString(),
        errors: ['Invalid TileJSON: missing tiles array'],
      };
    }
    return {
      landing: {
        title: typeof data.name === 'string' ? data.name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
      },
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [],
      tileJson: {
        tilejson: typeof data.tilejson === 'string' ? data.tilejson : '',
        tiles: tiles as string[],
        name: typeof data.name === 'string' ? data.name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        minzoom: typeof data.minzoom === 'number' ? data.minzoom : undefined,
        maxzoom: typeof data.maxzoom === 'number' ? data.maxzoom : undefined,
        bounds: Array.isArray(data.bounds) ? data.bounds as [number, number, number, number] : undefined,
        center: Array.isArray(data.center) ? data.center as [number, number, number] : undefined,
      },
    };
  } catch (err) {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [`TileJSON fetch failed: ${errorMessage(err)}`],
    };
  }
}

// --- ArcGIS cached MapServer inspection ---

async function inspectArcgisSource(url: string): Promise<InspectionResult> {
  try {
    const meta = await fetchArcgisServiceInfo(
      normalizeUrl(url),
      undefined,
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    );
    return {
      landing: { title: meta.name, description: meta.attribution },
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [],
      arcgis: meta,
    };
  } catch (err) {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [`ArcGIS inspection failed: ${errorMessage(err)}`],
    };
  }
}

// --- Main inspection router ---

export async function inspectSource(url: string): Promise<InspectionResult> {
  const sourceType = detectTileSourceType(url);

  if (sourceType === 'tilejson') {
    return inspectTileJsonSource(url);
  }

  if (sourceType === 'arcgis') {
    return inspectArcgisSource(url);
  }

  if (sourceType === 'xyz') {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [],
    };
  }

  if (sourceType === 'style') {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [
        'Style URLs are not valid as imagery sources. Use the Basemaps tab → "Style URL" mode instead.',
      ],
    };
  }

  return inspectOgcSource(url);
}
