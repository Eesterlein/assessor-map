// Resolve the effective MapLibre zoom bounds for one style of a layer.
//
// A layer can carry overall `minZoom`/`maxZoom` bounds, and each of its styles
// can narrow them further (e.g. one layer stacking "4WD roads" (maxZoom 11),
// "local roads" (minZoom 11, maxZoom 15) and "highways" (no override) as three
// styles). MapLibre only understands a single `minzoom`/`maxzoom` pair per
// rendered layer, so the per-app renderers (`renderStyleLayers` /
// `renderPreviewStyleLayers`) call this once per style and spread the result
// into the props shared by every `<Layer>` that style produces — including all
// `dashByCategory`-expanded sub-layers.

/** Minimal structural shape of a layer/style needed to resolve zoom bounds. */
export interface ZoomBounded {
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Intersect a layer's zoom bounds with a style's narrower override into the
 * `{minzoom, maxzoom}` pair (MapLibre's lowercase prop names) to spread into a
 * `<Layer>`'s props. Effective min is the greatest of the two defined mins;
 * effective max is the least of the two defined maxes; a key is absent when
 * neither side defines it.
 *
 * Deliberately does NOT clamp or throw when the intersection is empty (e.g.
 * layer minZoom=10 with a style maxZoom=5): MapLibre simply renders nothing in
 * an inverted range, matching how minzoom>maxzoom already behaves elsewhere.
 */
export function resolveStyleZoomBounds(
  layer: ZoomBounded,
  style: ZoomBounded,
): { minzoom?: number; maxzoom?: number } {
  const out: { minzoom?: number; maxzoom?: number } = {};

  if (layer.minZoom != null && style.minZoom != null) {
    out.minzoom = Math.max(layer.minZoom, style.minZoom);
  } else if (layer.minZoom != null) {
    out.minzoom = layer.minZoom;
  } else if (style.minZoom != null) {
    out.minzoom = style.minZoom;
  }

  if (layer.maxZoom != null && style.maxZoom != null) {
    out.maxzoom = Math.min(layer.maxZoom, style.maxZoom);
  } else if (layer.maxZoom != null) {
    out.maxzoom = layer.maxZoom;
  } else if (style.maxZoom != null) {
    out.maxzoom = style.maxZoom;
  }

  return out;
}
