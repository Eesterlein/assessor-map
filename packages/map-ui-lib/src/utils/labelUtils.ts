/**
 * Display-name resolution for imagery layers, basemaps, and anything else
 * with an optional human-friendly `label` and a machine `id`.
 *
 * Single source of truth for the `label || id` fallback convention used by
 * every render surface (ImageryPanel, BasemapSwitcher, ImageryList,
 * BasemapList, ConfigReview, …) so a blank/whitespace label never renders
 * as empty text.
 *
 * Pure function — no DOM or React imports; safe in both browser and node
 * vitest environments.
 */

export interface Labeled {
  label?: string | null;
  id: string;
}

/**
 * Returns the trimmed `label` when it is non-blank, otherwise the `id`
 * verbatim. Callers that need a final catch-all for rows whose `id` is also
 * blank (e.g. a not-yet-saved custom row mid-edit) can do
 * `resolveDisplayLabel(x) || 'Untitled'`.
 */
export function resolveDisplayLabel(entry: Labeled): string {
  const trimmed = entry.label?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : entry.id;
}
