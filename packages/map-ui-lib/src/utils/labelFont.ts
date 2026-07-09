import type { StyleConfig } from '../types';

/**
 * Merge a map-level default `text-font` into a symbol style's resolved layout.
 *
 * Single source of truth for the override-resolution rule shared by the
 * map-client renderer (`MapContainer.tsx`) and the admin preview renderer
 * (`MapPreview.tsx`) — mirroring how `expandDashByCategory` /
 * `buildGeometryFilter` / `getSubLayerId` are shared to keep the two
 * hand-duplicated renderers from drifting.
 *
 * Rules:
 * - Only `symbol`-type styles are affected; all other types pass through.
 * - An explicit `text-font` on the style's own layout always wins.
 * - A missing or empty `defaultLabelFont` is a no-op.
 * - Never mutates the input `layout`; returns a new object when injecting.
 */
export function applyDefaultLabelFont(
  layout: Record<string, unknown>,
  style: StyleConfig,
  defaultLabelFont?: string[],
): Record<string, unknown> {
  if (style.type !== 'symbol') return layout;
  if (layout['text-font'] != null) return layout;
  if (!defaultLabelFont || defaultLabelFont.length === 0) return layout;
  return { ...layout, 'text-font': defaultLabelFont };
}
