import type { ViewConfig } from '@techtraverse/map-ui-lib';

export const DEFAULT_VIEW: ViewConfig = {
  latitude: 0,
  longitude: 0,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

/**
 * Normalize an initialView read from a raw (un-parsed) config document.
 * ViewConfigSchema defaults pitch/bearing at Zod-parse time, but the admin
 * loads config JSON directly — a config created outside the wizard can omit
 * them, and `<Map bearing={undefined}>` makes MapLibre's projection matrix
 * singular ("failed to invert matrix"), crashing the preview.
 */
export function normalizeInitialView(view: Partial<ViewConfig> | undefined): ViewConfig {
  return { ...DEFAULT_VIEW, ...view };
}
