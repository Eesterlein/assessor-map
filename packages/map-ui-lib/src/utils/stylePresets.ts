import type { StyleConfig, FillStyle, LineStyle, CircleStyle, SymbolStyle, AvailableProperty } from '../types';

export type StylePresetGeometry = 'polygon' | 'line' | 'point';

export interface StylePreset {
  id: string;
  label: string;
  description: string;
  geometry: StylePresetGeometry;
  /**
   * Optional grouping label shown as a section header in the preset picker.
   * Presets without a category are shown first as prominent "Quick Start" recipes.
   */
  category?: string;
  /**
   * Build a StyleConfig array for this preset.
   * @param color  Primary hex color chosen by the user or a geometry default.
   * @param fields Available properties from queryables — recipe presets use
   *               this to auto-wire the best label field.
   */
  build: (color: string, fields?: AvailableProperty[]) => StyleConfig[];
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function darken(hex: string, amount = 0.25): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ─── Label field auto-detection ───────────────────────────────────────────────

/**
 * Returns the most appropriate string field to use as a map label, scanning
 * queryable properties in priority order:
 *   1. Canonical names: name, label, title, description
 *   2. Field whose name contains "name" or "label" (e.g. ownername, roadlabel)
 *   3. First string field with a human-readable title hint
 *   4. First string field
 */
export function findLabelField(fields: AvailableProperty[]): string | null {
  if (!fields.length) return null;
  const strs = fields.filter((f) => f.type === 'string');
  if (!strs.length) return null;

  const canonical = strs.find((f) => ['name', 'label', 'title', 'description'].includes(f.name));
  if (canonical) return canonical.name;

  const byConvention = strs.find(
    (f) => f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('label'),
  );
  if (byConvention) return byConvention.name;

  const titled = strs.find((f) => f.title && f.title !== f.name);
  if (titled) return titled.name;

  return strs[0].name;
}

// ─── Shared label style factories ─────────────────────────────────────────────

function centroidLabel(field: string, size = 10): SymbolStyle {
  return {
    type: 'symbol',
    paint: { 'text-color': '#222222', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
    layout: { 'text-field': `{${field}}`, 'text-size': size, 'symbol-placement': 'point' as const },
  };
}

function lineLabel(field: string, size = 10): SymbolStyle {
  return {
    type: 'symbol',
    paint: { 'text-color': '#1a1a1a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
    layout: {
      'text-field': `{${field}}`,
      'text-size': size,
      'symbol-placement': 'line' as const,
      'symbol-spacing': 250,
    },
  };
}

// ─── Recipe preset builders (polygon) ─────────────────────────────────────────

/** Thin border + transparent fill + small centroid labels. Classic parcel grid look. */
function recipePolygonOutlined(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  const styles: StyleConfig[] = [
    { type: 'fill', paint: { 'fill-color': '#000000', 'fill-opacity': 0, 'fill-antialias': false } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 0.75, 'line-opacity': 1 } } satisfies LineStyle,
  ];
  if (labelField) styles.push(centroidLabel(labelField, 9));
  return styles;
}

/** 35 % translucent fill + thin border + centroid labels. Good for thematic parcel maps. */
function recipePolygonFilled(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  const styles: StyleConfig[] = [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.35, 'fill-outline-color': 'transparent', 'fill-antialias': true } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': darken(color, 0.3), 'line-width': 1, 'line-opacity': 1 } } satisfies LineStyle,
  ];
  if (labelField) styles.push(centroidLabel(labelField, 10));
  return styles;
}

/** 18 % fill + 2 px bold border. District / zone polygon style. */
function recipePolygonDistrict(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.18, 'fill-outline-color': 'transparent', 'fill-antialias': true } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.9 } } satisfies LineStyle,
  ];
}

/** 75 % solid fill, no labels. For heat maps or dense classification fills. */
function recipePolygonSolid(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.75, 'fill-antialias': true } } satisfies FillStyle,
  ];
}

// ─── Recipe preset builders (line) ────────────────────────────────────────────

/** Black-cased road line + name labels along the line. Classic highway cartography. */
function recipeLineNamedRoads(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  const styles: StyleConfig[] = [
    { type: 'line', paint: { 'line-color': darken(color, 0.7), 'line-width': 4, 'line-opacity': 1 } } satisfies LineStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1 } } satisfies LineStyle,
  ];
  if (labelField) styles.push(lineLabel(labelField, 10));
  return styles;
}

/** Single bold line + name labels. */
function recipeLineLabeled(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  const styles: StyleConfig[] = [
    { type: 'line', paint: { 'line-color': color, 'line-width': 2.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
  if (labelField) styles.push(lineLabel(labelField, 10));
  return styles;
}

/** Clean thin line, no labels. */
function recipeLineSimple(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    { type: 'line', paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

/** Long-dash boundary line. Subdivision / district boundary style. */
function recipeLineBoundary(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1, 'line-dasharray': [8, 4] } } satisfies LineStyle,
  ];
}

// ─── Recipe preset builders (point) ───────────────────────────────────────────

/** Medium circle + text label from first string field. */
function recipePointLabeled(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  const styles: StyleConfig[] = [
    {
      type: 'circle',
      paint: { 'circle-color': color, 'circle-radius': 5, 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 },
    } satisfies CircleStyle,
  ];
  if (labelField) {
    styles.push({
      type: 'symbol',
      paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
      layout: { 'text-field': `{${labelField}}`, 'text-size': 10, 'text-offset': [0, 1.2] },
    } satisfies SymbolStyle);
  }
  return styles;
}

/** Bold circle + white stroke. No label. */
function recipePointBold(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    {
      type: 'circle',
      paint: { 'circle-color': color, 'circle-radius': 7, 'circle-opacity': 1, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
    } satisfies CircleStyle,
  ];
}

/** Small 3 px dot. For dense address / parcel centroid data. */
function recipePointSmall(color: string, _fields?: AvailableProperty[]): StyleConfig[] {
  return [
    {
      type: 'circle',
      paint: { 'circle-color': color, 'circle-radius': 3, 'circle-opacity': 1, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 },
    } satisfies CircleStyle,
  ];
}

/** Icon symbol + text label. */
function recipePointIcon(color: string, fields?: AvailableProperty[]): StyleConfig[] {
  const labelField = fields ? findLabelField(fields) : null;
  return [
    {
      type: 'symbol',
      paint: { 'icon-color': color, ...(labelField ? { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } : {}) },
      layout: {
        'icon-image': 'circle-11',
        'icon-size': 1,
        ...(labelField ? { 'text-field': `{${labelField}}`, 'text-size': 10, 'text-offset': [0, 1.2] } : {}),
      },
    } satisfies SymbolStyle,
  ];
}

// ─── Generic (custom) preset builders ─────────────────────────────────────────
// These are the original structural presets. They move to the "Custom" category
// and are available for users who want full manual control.

function presetPolygonFill(color: string): StyleConfig[] {
  return [{ type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.6, 'fill-antialias': true } } satisfies FillStyle];
}

function presetPolygonFillOutline(color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.45, 'fill-outline-color': 'transparent', 'fill-antialias': true } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': darken(color, 0.35), 'line-width': 1.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

// Transparent fill keeps polygon interiors responsive to queryRenderedFeatures.
function presetPolygonOutline(color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0, 'fill-antialias': false } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

function presetLineSolid(color: string): StyleConfig[] {
  return [{ type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1 } } satisfies LineStyle];
}

function presetLineDashed(color: string): StyleConfig[] {
  return [{ type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1, 'line-dasharray': [2, 2] } } satisfies LineStyle];
}

function presetLineCased(color: string): StyleConfig[] {
  return [
    { type: 'line', paint: { 'line-color': darken(color, 0.4), 'line-width': 4, 'line-opacity': 1 } } satisfies LineStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

function presetPointCircle(color: string): StyleConfig[] {
  return [
    { type: 'circle', paint: { 'circle-color': color, 'circle-radius': 5, 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } } satisfies CircleStyle,
  ];
}

function presetPointIcon(_color: string): StyleConfig[] {
  return [{ type: 'symbol', paint: { 'icon-color': '#000000' }, layout: { 'icon-image': 'circle-11', 'icon-size': 1 } } satisfies SymbolStyle];
}

function presetPointCircleLabel(color: string): StyleConfig[] {
  return [
    { type: 'circle', paint: { 'circle-color': color, 'circle-radius': 5, 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } } satisfies CircleStyle,
    { type: 'symbol', paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 }, layout: { 'text-field': '{name}', 'text-size': 11, 'text-offset': [0, 1] } } satisfies SymbolStyle,
  ];
}

// ─── Preset registry ───────────────────────────────────────────────────────────

const DEFAULT_POLYGON_COLOR = '#4a90d9';
const DEFAULT_LINE_COLOR    = '#e63946'; // red — matches the reference image
const DEFAULT_POINT_COLOR   = '#e74c3c';

export const STYLE_PRESETS: readonly StylePreset[] = Object.freeze([
  // ── Quick-start recipe presets (shown first, no category) ──
  // Polygon
  {
    id: 'recipe-polygon-outlined',
    label: 'Outlined',
    description: 'Thin border + labels. Classic parcel grid look.',
    geometry: 'polygon',
    build: (color = '#555555', fields) => recipePolygonOutlined(color, fields),
  },
  {
    id: 'recipe-polygon-filled',
    label: 'Filled',
    description: 'Translucent fill + thin border + labels.',
    geometry: 'polygon',
    build: (color = DEFAULT_POLYGON_COLOR, fields) => recipePolygonFilled(color, fields),
  },
  {
    id: 'recipe-polygon-district',
    label: 'Districts',
    description: 'Light fill + bold border. Zones and district polygons.',
    geometry: 'polygon',
    build: (color = '#c87941', fields) => recipePolygonDistrict(color, fields),
  },
  {
    id: 'recipe-polygon-solid',
    label: 'Solid',
    description: 'Solid fill. Good for thematic or heat-map layers.',
    geometry: 'polygon',
    build: (color = DEFAULT_POLYGON_COLOR, fields) => recipePolygonSolid(color, fields),
  },
  // Line
  {
    id: 'recipe-line-named-roads',
    label: 'Named Roads',
    description: 'Cased line + road name labels along the line.',
    geometry: 'line',
    build: (color = DEFAULT_LINE_COLOR, fields) => recipeLineNamedRoads(color, fields),
  },
  {
    id: 'recipe-line-labeled',
    label: 'Labeled',
    description: 'Bold line + name labels.',
    geometry: 'line',
    build: (color = DEFAULT_LINE_COLOR, fields) => recipeLineLabeled(color, fields),
  },
  {
    id: 'recipe-line-simple',
    label: 'Simple',
    description: 'Clean colored line, no labels.',
    geometry: 'line',
    build: (color = '#2980b9', fields) => recipeLineSimple(color, fields),
  },
  {
    id: 'recipe-line-boundary',
    label: 'Boundary',
    description: 'Long-dash line for subdivision or admin boundaries.',
    geometry: 'line',
    build: (color = '#7b4f2e', fields) => recipeLineBoundary(color, fields),
  },
  // Point
  {
    id: 'recipe-point-labeled',
    label: 'Labeled Pins',
    description: 'Circle + label from the best text field.',
    geometry: 'point',
    build: (color = DEFAULT_POINT_COLOR, fields) => recipePointLabeled(color, fields),
  },
  {
    id: 'recipe-point-bold',
    label: 'Bold Dots',
    description: 'Large circle with white outline. High-visibility.',
    geometry: 'point',
    build: (color = DEFAULT_POINT_COLOR, fields) => recipePointBold(color, fields),
  },
  {
    id: 'recipe-point-small',
    label: 'Small Dots',
    description: 'Tiny 3 px circles for dense address or centroid data.',
    geometry: 'point',
    build: (color = '#1a73e8', fields) => recipePointSmall(color, fields),
  },
  {
    id: 'recipe-point-icon',
    label: 'Icon',
    description: 'Map pin icon, optionally with a text label.',
    geometry: 'point',
    build: (color = '#333333', fields) => recipePointIcon(color, fields),
  },

  // ── Generic / custom presets (shown under "Custom" for power users) ──
  {
    id: 'polygon-fill',
    label: 'Solid fill',
    description: 'Translucent fill, no outline.',
    geometry: 'polygon',
    category: 'Custom',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonFill(color),
  },
  {
    id: 'polygon-fill-outline',
    label: 'Fill + outline',
    description: 'Translucent fill with a darker boundary line.',
    geometry: 'polygon',
    category: 'Custom',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonFillOutline(color),
  },
  {
    id: 'polygon-outline',
    label: 'Outline only',
    description: 'Visible border with an invisible fill so polygon interiors stay clickable.',
    geometry: 'polygon',
    category: 'Custom',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonOutline(color),
  },
  {
    id: 'line-solid',
    label: 'Solid line',
    description: 'Single coloured line.',
    geometry: 'line',
    category: 'Custom',
    build: (color = DEFAULT_LINE_COLOR) => presetLineSolid(color),
  },
  {
    id: 'line-dashed',
    label: 'Dashed line',
    description: '2-2 dash pattern.',
    geometry: 'line',
    category: 'Custom',
    build: (color = DEFAULT_LINE_COLOR) => presetLineDashed(color),
  },
  {
    id: 'line-cased',
    label: 'Cased line',
    description: 'Highway-style — thick dark stroke under a thinner lighter stroke.',
    geometry: 'line',
    category: 'Custom',
    build: (color = DEFAULT_LINE_COLOR) => presetLineCased(color),
  },
  {
    id: 'point-circle',
    label: 'Circle',
    description: 'Coloured circle with a thin white stroke.',
    geometry: 'point',
    category: 'Custom',
    build: (color = DEFAULT_POINT_COLOR) => presetPointCircle(color),
  },
  {
    id: 'point-icon',
    label: 'Icon',
    description: 'Symbol icon from the sprite sheet.',
    geometry: 'point',
    category: 'Custom',
    build: (_color = DEFAULT_POINT_COLOR) => presetPointIcon(_color),
  },
  {
    id: 'point-circle-label',
    label: 'Circle + label',
    description: 'Circle with a text label drawn from {name}.',
    geometry: 'point',
    category: 'Custom',
    build: (color = DEFAULT_POINT_COLOR) => presetPointCircleLabel(color),
  },
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPresetsForGeometries(geoms: StylePresetGeometry[]): StylePreset[] {
  if (geoms.length === 0) return [];
  const set = new Set(geoms);
  return STYLE_PRESETS.filter((p) => set.has(p.geometry));
}

export function inferActivePresetId(styles: StyleConfig[] | undefined | null): string | null {
  if (!styles || styles.length === 0) return null;
  const types = styles.map((s) => s.type).join(',');

  // Recipe polygon presets with a label layer produce "fill,line,symbol".
  if (types === 'fill,line,symbol') {
    const fill = styles[0] as FillStyle;
    const fillOpacity = fill.paint['fill-opacity'];
    if (typeof fillOpacity === 'number' && fillOpacity === 0) return 'recipe-polygon-outlined';
    if (typeof fillOpacity === 'number' && fillOpacity <= 0.4) return 'recipe-polygon-filled';
    return null;
  }

  // recipe-line-labeled with a label layer produces "line,symbol".
  if (types === 'line,symbol') {
    const line = styles[0] as LineStyle;
    const w = line.paint['line-width'] as number;
    if (w >= 2.5) return 'recipe-line-labeled';
    return null;
  }

  // Any other symbol+fill combo we don't recognise — show as custom.
  if (types.includes('symbol') && types.includes('fill')) return null;

  if (types === 'fill') {
    const fill = styles[0] as FillStyle;
    const opacity = fill.paint['fill-opacity'];
    if (typeof opacity === 'number' && opacity >= 0.7) return 'recipe-polygon-solid';
    return 'polygon-fill';
  }
  if (types === 'fill,line') {
    const fill = styles[0] as FillStyle;
    const line = styles[1] as LineStyle;
    const fillOpacity = fill.paint['fill-opacity'];
    if (typeof fillOpacity === 'number' && fillOpacity === 0) {
      return (line.paint['line-width'] as number) <= 1 ? 'recipe-polygon-outlined' : 'polygon-outline';
    }
    if (typeof fillOpacity === 'number' && fillOpacity <= 0.2) return 'recipe-polygon-district';
    if (typeof fillOpacity === 'number' && fillOpacity <= 0.4) return 'recipe-polygon-filled';
    return 'polygon-fill-outline';
  }
  if (types === 'line') {
    const line = styles[0] as LineStyle;
    if (Array.isArray(line.paint['line-dasharray'])) {
      const dash = line.paint['line-dasharray'] as number[];
      return dash[0] >= 6 ? 'recipe-line-boundary' : 'line-dashed';
    }
    const w = line.paint['line-width'] as number;
    if (w >= 2.5) return 'recipe-line-labeled';
    if (w >= 2) return 'line-solid';
    return 'recipe-line-simple';
  }
  if (types === 'line,line') return 'line-cased';
  if (types === 'circle') {
    const circle = styles[0] as CircleStyle;
    const r = circle.paint['circle-radius'] as number;
    if (r <= 3) return 'recipe-point-small';
    if (r >= 7) return 'recipe-point-bold';
    return 'point-circle';
  }
  if (types === 'symbol') {
    const sym = styles[0] as SymbolStyle;
    const layout = (sym.layout ?? {}) as Record<string, unknown>;
    if ('icon-image' in layout) {
      // recipe-point-icon includes both icon and text-field; point-icon is icon-only
      return 'text-field' in layout ? 'recipe-point-icon' : 'point-icon';
    }
  }
  if (types === 'circle,symbol') {
    const sym = styles[1] as SymbolStyle;
    if (sym.layout && 'text-field' in sym.layout) {
      // recipe-point-labeled uses text-size 10; point-circle-label uses 11
      const size = (sym.layout as Record<string, unknown>)['text-size'];
      return typeof size === 'number' && size <= 10 ? 'recipe-point-labeled' : 'point-circle-label';
    }
  }
  if (types === 'line,line,symbol') return 'recipe-line-named-roads';
  return null;
}

/**
 * Builds the road-shields symbol style (used by the "+ Add road shields"
 * quick action in LayerEditor).
 */
export function buildRoadShieldsStyle(
  labelProp: string,
  geometryFilter?: ('LineString' | 'MultiLineString')[],
): SymbolStyle {
  return {
    type: 'symbol',
    paint: { 'icon-color': '#1a5fb4', 'text-color': '#ffffff' },
    layout: {
      'text-field': `{${labelProp}}`,
      'text-size': 10,
      'symbol-placement': 'line',
      'symbol-spacing': 300,
      'icon-image': 'shields:shield-generic',
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [2, 6, 2, 6],
      'icon-allow-overlap': false,
      'text-allow-overlap': false,
    },
    ...(geometryFilter ? { geometryFilter } : {}),
  };
}
