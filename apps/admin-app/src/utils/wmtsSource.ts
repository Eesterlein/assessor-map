import type { WmtsSource, SourceAuth } from '@techtraverse/map-ui-lib';

/**
 * The `wmts*` keys stored in a saved source row's `metadata` JSON column.
 * Single source of truth for this shape — `SourcesPage`, the wizard's
 * `SavedSourceSummary`, and the converters below all reference it, so a new
 * WMTS field is added here once.
 */
export interface WmtsSourceMetadata {
  wmtsLayer?: string;
  wmtsStyle?: string;
  wmtsFormat?: string;
  wmtsTileMatrixSet?: string;
  wmtsTileSize?: number;
  wmtsTileUrlTemplate?: string;
  wmtsMaxZoom?: number;
}

/**
 * Minimal structural shape of a saved source row that carries WMTS params.
 * Both `SourcesPage`'s `SavedSource` and the wizard's `SavedSourceSummary`
 * satisfy this, so a single converter reconstructs a `WmtsSource` from either.
 * WMTS specifics live in the `metadata` JSON column under `wmts*` keys
 * (see `apps/admin-app/server/index.ts` create/update paths).
 */
export interface SavedWmtsSourceFields {
  source_id: string;
  url: string;
  label?: string | null;
  tile_matrix_set_id?: string;
  auth?: SourceAuth | null;
  proxy?: boolean;
  metadata?: WmtsSourceMetadata | null;
}

/**
 * True if a saved source row plays the imagery role (raster tiles) — i.e. it
 * belongs under the admin "Imagery" tab and can back an imagery layer. WMTS is
 * intrinsically raster imagery; OGC imagery sources carry `source_type:'imagery'`.
 * Single source of truth for the imagery-role `source_type` set (mirrors the
 * lib's `isImagerySource` for the in-config `MapSource` union).
 */
export function savedSourceIsImagery(s: { source_type?: string | null }): boolean {
  return s.source_type === 'imagery' || s.source_type === 'wmts';
}

/**
 * Inverse of `savedSourceToWmts`: build the `POST/PUT /api/sources` payload
 * from a `WmtsSource`. Both the create and edit paths send exactly this, so a
 * new WMTS field only needs adding to `WmtsSourceMetadata` and this builder.
 */
export function wmtsSourceToSavedFields(source: WmtsSource): {
  source_id: string;
  url: string;
  label: string | null;
  tile_matrix_set_id: string;
  source_type: 'wmts';
  auth: SourceAuth | null;
  proxy: boolean;
  metadata: WmtsSourceMetadata;
} {
  return {
    source_id: source.id,
    url: source.capabilitiesUrl,
    label: source.label || null,
    tile_matrix_set_id: source.tileMatrixSet || 'WebMercatorQuad',
    source_type: 'wmts',
    auth: source.auth ?? null,
    proxy: source.proxy ?? false,
    metadata: {
      wmtsLayer: source.layer,
      wmtsStyle: source.style,
      wmtsFormat: source.format,
      wmtsTileMatrixSet: source.tileMatrixSet,
      wmtsTileSize: source.tileSize,
      wmtsTileUrlTemplate: source.tileUrlTemplate,
      wmtsMaxZoom: source.maxZoom,
    },
  };
}

/** Reconstruct a `WmtsSource` from a persisted source row (`url` = capabilitiesUrl). */
export function savedSourceToWmts(s: SavedWmtsSourceFields): WmtsSource {
  return {
    id: s.source_id,
    sourceType: 'wmts',
    capabilitiesUrl: s.url,
    label: s.label ?? undefined,
    layer: s.metadata?.wmtsLayer ?? '',
    style: s.metadata?.wmtsStyle ?? 'default',
    format: s.metadata?.wmtsFormat ?? 'image/png',
    tileMatrixSet: s.metadata?.wmtsTileMatrixSet ?? s.tile_matrix_set_id ?? 'WebMercatorQuad',
    tileSize: s.metadata?.wmtsTileSize ?? 256,
    maxZoom: s.metadata?.wmtsMaxZoom,
    tileUrlTemplate: s.metadata?.wmtsTileUrlTemplate,
    auth: s.auth ?? undefined,
    proxy: s.proxy,
  };
}
