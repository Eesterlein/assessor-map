/**
 * Translate a Zod issue `path` array (e.g. `['imageryLayers', 0, 'sourceId']`)
 * into a human-friendly breadcrumb (e.g. `Imagery layer #1 → Source`).
 *
 * Used by the wizard to surface validation errors in copy that points at a
 * specific row + field rather than dotted JSON-pointer-ish noise.
 */

interface SegmentLabels {
  /** Singular human label for the array, used with #N suffix. */
  rowLabel?: string;
  /** Pretty label for a leaf field name. */
  fieldLabels?: Record<string, string>;
  /** Per-child path label override map keyed by child segment. */
  children?: Record<string, SegmentLabels>;
}

const ROOT_LABELS: Record<string, SegmentLabels> = {
  imageryLayers: {
    rowLabel: 'Imagery layer',
    fieldLabels: {
      sourceId: 'Source',
      collection: 'Collection',
      tileUrlTemplate: 'Tile URL',
      label: 'Label',
      id: 'ID',
      opacity: 'Opacity',
      tileSize: 'Tile size',
      minZoom: 'Min zoom',
      maxZoom: 'Max zoom',
      thumbnailUrl: 'Thumbnail URL',
    },
  },
  layers: {
    rowLabel: 'Layer',
    fieldLabels: {
      id: 'ID',
      label: 'Label',
      sourceId: 'Source',
      collection: 'Collection',
      cql2Filter: 'CQL2 filter',
    },
    children: {
      search: {
        fieldLabels: { fields: 'Search fields' },
        children: {
          fields: {
            rowLabel: 'Search field',
            fieldLabels: {
              property: 'Property',
              label: 'Label',
              type: 'Field type',
              placeholder: 'Placeholder',
            },
          },
        },
      },
      styles: {
        rowLabel: 'Style',
        fieldLabels: {
          type: 'Style type',
          paint: 'Paint',
          layout: 'Layout',
          minZoom: 'Min zoom',
          maxZoom: 'Max zoom',
        },
      },
      legend: {
        fieldLabels: { entries: 'Legend entries' },
        children: {
          entries: {
            rowLabel: 'Legend entry',
            fieldLabels: {
              label: 'Label',
              color: 'Color',
              shape: 'Shape',
            },
          },
        },
      },
    },
  },
  sources: {
    rowLabel: 'Source',
    fieldLabels: {
      id: 'ID',
      url: 'URL',
      label: 'Label',
      type: 'Type',
    },
  },
  basemaps: {
    rowLabel: 'Basemap',
    fieldLabels: {
      id: 'ID',
      label: 'Label',
      style: 'Style',
      tiles: 'Tile URL',
    },
  },
  globalSearch: {
    fieldLabels: { layers: 'Layers', placeholder: 'Placeholder' },
    children: {
      layers: {
        rowLabel: 'Global-search layer',
        fieldLabels: { layerId: 'Layer ID', properties: 'Properties' },
        children: {
          properties: {
            rowLabel: 'Property',
            fieldLabels: {
              property: 'Property',
              label: 'Label',
            },
          },
        },
      },
    },
  },
  ui: {
    fieldLabels: { showSearch: 'Show search', showLegend: 'Show legend' },
  },
  initialView: {
    fieldLabels: { lat: 'Latitude', lng: 'Longitude', zoom: 'Zoom' },
  },
};

const DEFAULT_FIELD_PRETTY: Record<string, string> = {
  sourceId: 'Source',
  tileUrlTemplate: 'Tile URL',
  collection: 'Collection',
  property: 'Property',
  label: 'Label',
  layerId: 'Layer ID',
};

function prettifyKey(key: string): string {
  if (DEFAULT_FIELD_PRETTY[key]) return DEFAULT_FIELD_PRETTY[key];
  // camelCase / snake_case → "Camel Case"
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export function prettifyZodPath(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return 'Config';

  const out: string[] = [];
  // Tracks the current label-tree node as we descend; explicitly widened so
  // subsequent indexed reads (`cursor?.children?.[seg]`) typecheck.
  let cursor: SegmentLabels | undefined;
  let i = 0;

  while (i < path.length) {
    const seg = path[i];

    if (typeof seg === 'string') {
      // Look up labels for this segment
      const labels: SegmentLabels | undefined = i === 0 ? ROOT_LABELS[seg] : cursor?.children?.[seg];
      const fieldLabel = i === 0
        ? prettifyKey(seg)
        : cursor?.fieldLabels?.[seg] ?? prettifyKey(seg);

      // If this is an array container (next is a number), defer the rendering
      // to the row branch so we can produce "Imagery layer #1" not
      // "ImageryLayers → 0".
      const next = path[i + 1];
      if (typeof next === 'number' && labels?.rowLabel) {
        out.push(`${labels.rowLabel} #${next + 1}`);
        cursor = labels;
        i += 2;
        continue;
      }

      out.push(fieldLabel);
      cursor = labels ?? undefined;
      i += 1;
    } else {
      // Bare numeric index (no label found) — fall back to "[N]".
      out.push(`#${seg + 1}`);
      i += 1;
    }
  }

  return out.join(' → ');
}

/** Combine a prettified path with an issue message for wizard display. */
export function prettifyZodIssue(issue: { path: ReadonlyArray<PropertyKey>; message: string }): string {
  // Drop any symbol segments — Zod's path type technically allows them but
  // in practice issue paths only contain string/number segments.
  const path = issue.path.filter(
    (s): s is string | number => typeof s === 'string' || typeof s === 'number',
  );
  const head = prettifyZodPath(path);
  if (!head || head === 'Config') return issue.message;
  return `${head}: ${issue.message}`;
}
