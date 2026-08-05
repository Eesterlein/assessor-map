/**
 * Pre-save lint pass for the wizard.
 *
 * Surfaces issues that pass the Zod schema (or aren't expressible there) but
 * should still block save with a clear, row-specific message. Each issue is
 * structured so the wizard can render a one-click remediation button.
 *
 * Currently handles:
 *  - Imagery rows that have no source/collection AND no custom tile URL.
 *  - Otherwise-complete imagery rows with a blank label (warning — the
 *    imagery toggle falls back to the row's ID).
 *  - Basemaps with a blank label (warning — the basemap toggle falls back
 *    to the basemap's ID).
 *  - Per-layer search fields whose `property` is unknown to that layer's
 *    queryables, or whose `type` is incompatible with the queryable's type.
 *  - Global-search property rows that duplicate another `property` within
 *    the same layer entry, or that have no `label`.
 */

import type {
  AvailableProperty,
  BasemapConfig,
  ImageryLayerConfig,
  LayerConfig,
  SearchField,
  GlobalSearchConfig,
} from '@techtraverse/map-ui-lib';

/**
 * Local mirror of `isImageryLayerIncomplete` exported from the lib —
 * inlined here so this module stays import-safe in node test environments
 * (the lib's main bundle touches `document` at module load time).
 */
function isImageryLayerIncomplete(layer: ImageryLayerConfig): boolean {
  const noSource = !layer.sourceId || layer.sourceId.trim().length === 0;
  const noTileUrl = !layer.tileUrlTemplate || layer.tileUrlTemplate.trim().length === 0;
  const noCollection = !layer.collection || layer.collection.trim().length === 0;
  return noSource && noTileUrl && noCollection;
}

export type WizardLintSeverity = 'error' | 'warning';

export type WizardLintRemediationKind =
  | { kind: 'remove-imagery-row'; index: number }
  | { kind: 'remove-search-field'; layerId: string; index: number }
  | { kind: 'remove-global-search-property'; layerId: string; index: number };

export interface WizardLintIssue {
  severity: WizardLintSeverity;
  message: string;
  /** Pretty path for display (already prefixed). */
  path: string;
  remediation?: WizardLintRemediationKind;
}

/** True when a search field's data type is compatible with a queryable's JSON-schema type. */
export function isSearchFieldTypeCompatible(
  field: SearchField,
  ap: AvailableProperty,
): boolean {
  const apType = (ap.type ?? '').toLowerCase();
  const apFormat = (ap.format ?? '').toLowerCase();

  switch (field.type) {
    case 'text':
      // Text fields tolerate string + unknown queryable types (the API may
      // omit type on some fields). Disallow purely numeric / boolean.
      if (apType === 'number' || apType === 'integer' || apType === 'boolean') return false;
      return true;
    case 'select':
      // Select supports any scalar — string is the most common, numeric enums
      // are valid too.
      if (apType === 'boolean') return false;
      return true;
    case 'number':
      return apType === 'number' || apType === 'integer';
    case 'datetime':
      if (apType === 'string' && (apFormat === 'date-time' || apFormat === 'date')) return true;
      // Some servers report datetime fields as raw strings without format —
      // accept that conservatively to avoid false positives.
      if (apType === 'string' && (ap.name.toLowerCase().includes('date') || ap.name.toLowerCase().includes('time'))) {
        return true;
      }
      return false;
    default:
      return true;
  }
}

export interface LintInput {
  layers: LayerConfig[];
  imageryLayers: ImageryLayerConfig[];
  /** Optional so existing callers/fixtures that omit it keep working. */
  basemaps?: BasemapConfig[];
  globalSearch: GlobalSearchConfig | undefined;
  /** Map of layer-id → AvailableProperty[] from the queryables fetcher. */
  queryablesByLayer: Record<string, AvailableProperty[]>;
  /** Optional map indicating which layers' queryables are still loading; we
   * skip search-field validation on those layers to avoid flicker errors. */
  queryablesLoading?: Record<string, boolean>;
}

export function lintMapConfig(input: LintInput): WizardLintIssue[] {
  const issues: WizardLintIssue[] = [];
  const { layers, imageryLayers, basemaps = [], globalSearch, queryablesByLayer, queryablesLoading } = input;

  // --- Imagery rows ---
  imageryLayers.forEach((layer, index) => {
    if (isImageryLayerIncomplete(layer)) {
      issues.push({
        severity: 'error',
        path: `Imagery layer #${index + 1}`,
        message: `"${layer.label || layer.id || 'Untitled'}" needs a Source + Collection or a custom Tile URL.`,
        remediation: { kind: 'remove-imagery-row', index },
      });
    } else if (!layer.label || layer.label.trim().length === 0) {
      // Only warn when the row is otherwise fetchable — incomplete rows
      // already get the (more urgent) error above.
      issues.push({
        severity: 'warning',
        path: `Imagery layer #${index + 1}`,
        message: 'No label set — the imagery toggle will show its ID instead of a friendly name.',
      });
    }
  });

  // --- Basemaps: blank labels ---
  basemaps.forEach((basemap, index) => {
    if (!basemap.label || basemap.label.trim().length === 0) {
      issues.push({
        severity: 'warning',
        path: `Basemap #${index + 1}`,
        message: 'No label set — the basemap toggle will show its ID instead of a friendly name.',
      });
    }
  });

  // --- Per-layer search fields ---
  layers.forEach((layer) => {
    const fields = layer.search?.fields ?? [];
    if (fields.length === 0) return;
    if (queryablesLoading?.[layer.id]) return;

    const props = queryablesByLayer[layer.id];
    if (!props || props.length === 0) return; // can't check without data

    fields.forEach((field, index) => {
      if (!field.property || field.property.trim().length === 0) return;
      const ap = props.find((p) => p.name === field.property);
      if (!ap) {
        issues.push({
          severity: 'error',
          path: `Layer "${layer.label || layer.id}" → Search field #${index + 1}`,
          message: `Property "${field.property}" doesn't exist in this collection's queryables.`,
          remediation: { kind: 'remove-search-field', layerId: layer.id, index },
        });
        return;
      }
      if (!isSearchFieldTypeCompatible(field, ap)) {
        issues.push({
          severity: 'error',
          path: `Layer "${layer.label || layer.id}" → Search field #${index + 1}`,
          message: `Property "${field.property}" is type "${ap.type ?? 'unknown'}" — incompatible with field type "${field.type}".`,
          remediation: { kind: 'remove-search-field', layerId: layer.id, index },
        });
      }
    });
  });

  // --- Global search rows: duplicate properties + missing labels ---
  if (globalSearch?.layers) {
    globalSearch.layers.forEach((entry) => {
      const seenProps = new Map<string, number>();
      entry.properties.forEach((prop, index) => {
        if (!prop.property) return;
        const previous = seenProps.get(prop.property);
        if (previous !== undefined) {
          issues.push({
            severity: 'warning',
            path: `Global search → "${entry.layerId}" → Property #${index + 1}`,
            message: `Property "${prop.property}" appears more than once for this layer (also at row #${previous + 1}).`,
            remediation: { kind: 'remove-global-search-property', layerId: entry.layerId, index },
          });
        } else {
          seenProps.set(prop.property, index);
        }
        if (!prop.label || prop.label.trim().length === 0) {
          issues.push({
            severity: 'warning',
            path: `Global search → "${entry.layerId}" → Property #${index + 1}`,
            message: `Property "${prop.property}" has no label — autocomplete results will be unlabeled.`,
          });
        }
      });
    });
  }

  return issues;
}
