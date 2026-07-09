import type { SourceAuth } from '../types';
import { appendAuth, authHeaders, stripTrailingSlash } from './ogcApi';

/**
 * True for the root URL of an ArcGIS REST MapServer, e.g.
 * `https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer`.
 * Deliberately does not match sub-paths (`/MapServer/tile/...`), ImageServer,
 * or FeatureServer — only a cached MapServer root can serve XYZ tiles.
 * Plain string checks (no regex) so untrusted input can't trigger backtracking.
 */
export function isArcgisMapServerUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0]!.toLowerCase();
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed.endsWith('/mapserver') && trimmed.includes('/rest/services/');
}

/**
 * Build a MapLibre tile URL template for an ArcGIS cached MapServer.
 * ArcGIS tile paths are `/tile/{level}/{row}/{col}` — i.e. z/y/x. MapLibre
 * substitutes `{z}`/`{y}`/`{x}` by token name, so the order is handled.
 */
export function buildArcgisTileUrlTemplate(baseUrl: string): string {
  return `${stripTrailingSlash(baseUrl)}/tile/{z}/{y}/{x}`;
}

/** Metadata derived from an ArcGIS MapServer `?f=json` service description. */
export interface ArcgisTileMetadata {
  tileUrlTemplate: string;
  /** Shallowest LOD the cache has tiles for (usually 0). */
  minZoom: number;
  /** Deepest LOD the cache has tiles for; renderers pass it as Source maxzoom so MapLibre overzooms. */
  maxZoom: number;
  tileSize: number;
  wkid: number;
  name?: string;
  attribution?: string;
}

interface ArcgisServiceInfo {
  error?: { message?: string };
  mapName?: string;
  documentInfo?: { Title?: string };
  copyrightText?: string;
  singleFusedMapCache?: boolean;
  tileInfo?: {
    rows?: number;
    cols?: number;
    spatialReference?: { wkid?: number; latestWkid?: number };
    lods?: Array<{ level: number }>;
  };
}

const WEB_MERCATOR_WKIDS = new Set([3857, 102100]);

/**
 * Parse an ArcGIS MapServer service description (`?f=json`) into tile metadata.
 * Throws a descriptive error when the service cannot back an XYZ tile source.
 */
export function parseArcgisServiceInfo(json: unknown, baseUrl: string): ArcgisTileMetadata {
  const info = json as ArcgisServiceInfo;
  if (!info || typeof info !== 'object') {
    throw new Error('ArcGIS service description is not a JSON object');
  }
  // ArcGIS returns errors as HTTP 200 with an { error } body
  if (info.error) {
    throw new Error(`ArcGIS service error: ${info.error.message ?? 'unknown error'}`);
  }
  if (info.singleFusedMapCache !== true || !info.tileInfo) {
    throw new Error(
      'This ArcGIS MapServer is not a cached tile service — only cached (singleFusedMapCache) services can be used as tile sources',
    );
  }
  const sr = info.tileInfo.spatialReference;
  const wkid = sr?.latestWkid ?? sr?.wkid;
  if (wkid == null || !WEB_MERCATOR_WKIDS.has(wkid)) {
    throw new Error(
      `ArcGIS cache is not in Web Mercator (wkid ${wkid ?? 'unknown'}) — cannot be used with this map`,
    );
  }
  const lods = info.tileInfo.lods ?? [];
  if (lods.length === 0) {
    throw new Error('ArcGIS cache reports no LODs (zoom levels)');
  }
  const tileSize = info.tileInfo.rows ?? 256;
  if (tileSize !== 256 && tileSize !== 512) {
    throw new Error(`ArcGIS cache uses unsupported tile size ${tileSize} (expected 256 or 512)`);
  }
  const levels = lods.map((l) => l.level);
  return {
    tileUrlTemplate: buildArcgisTileUrlTemplate(baseUrl),
    minZoom: Math.min(...levels),
    maxZoom: Math.max(...levels),
    tileSize,
    wkid,
    name: info.mapName ?? info.documentInfo?.Title,
    attribution: info.copyrightText || undefined,
  };
}

/**
 * Fetch and parse an ArcGIS MapServer service description.
 * The tile template is derived from the *final* response URL, so an
 * http→https redirect upgrades the template scheme automatically.
 * Pass an AbortSignal to bound the request (e.g. `AbortSignal.timeout(10_000)`).
 */
export async function fetchArcgisServiceInfo(
  url: string,
  auth?: SourceAuth,
  signal?: AbortSignal,
): Promise<ArcgisTileMetadata> {
  const root = stripTrailingSlash(url.split(/[?#]/)[0]!);
  const response = await fetch(appendAuth(`${root}?f=json`, auth), {
    headers: { Accept: 'application/json', ...authHeaders(auth) },
    signal,
  });
  if (!response.ok) {
    throw new Error(`ArcGIS service request failed: ${response.status} ${response.statusText}`);
  }
  // Prefer the post-redirect URL (minus our ?f=json) as the template base
  const finalRoot = response.url ? stripTrailingSlash(response.url.split(/[?#]/)[0]!) : root;
  const json = (await response.json()) as unknown;
  return parseArcgisServiceInfo(json, finalRoot || root);
}
